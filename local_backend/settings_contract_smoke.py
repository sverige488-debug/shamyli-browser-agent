"""Fast contract smoke tests for the thin modern-UI -> Browser Use adapters.

This intentionally does not launch a browser. The real browser launch is already
covered by browser_smoke.py on Windows and Ubuntu. Here we verify that modern UI
contracts translate into Browser Use 0.13.10 native profile/provider/agent fields.
"""

import tempfile
from inspect import signature
from pathlib import Path

from browser_use import Agent, ChatOllama, ChatOpenAI, ChatOpenRouter

from app import (
    INSPECT_EXCLUDED_ACTIONS,
    BrowserSettings,
    LLMSettings,
    LocalSession,
    MCPServerSettings,
    RunRequest,
    browser_settings_snapshot,
    build_browser_session,
    build_llm,
    build_session_tools,
    llm_settings_snapshot,
    session_artifact_paths,
)


def main() -> None:
    llm_settings = LLMSettings(temperature=0.7, baseUrl="http://127.0.0.1:11434", ollamaNumCtx=24000)
    llm_shape = llm_settings_snapshot(llm_settings)
    assert llm_shape == {
        "temperature": 0.7,
        "baseUrl": "http://127.0.0.1:11434",
        "ollamaNumCtx": 24000,
    }

    openrouter = build_llm("openrouter::anthropic/claude-sonnet-4-6", LLMSettings(temperature=0.4))
    assert isinstance(openrouter, ChatOpenRouter)
    assert openrouter.temperature == 0.4

    openai = build_llm(
        "openai::gpt-5",
        LLMSettings(temperature=0.3, baseUrl="http://127.0.0.1:9999/v1"),
    )
    assert isinstance(openai, ChatOpenAI)
    assert openai.temperature == 0.3
    assert str(openai.base_url) == "http://127.0.0.1:9999/v1"

    ollama = build_llm("ollama::qwen3", llm_settings)
    assert isinstance(ollama, ChatOllama)
    assert ollama.host == "http://127.0.0.1:11434"
    assert ollama.ollama_options is not None
    assert ollama.ollama_options["num_ctx"] == 24000
    assert ollama.ollama_options["temperature"] == 0.7

    with tempfile.TemporaryDirectory() as tmp_dir:
        settings = BrowserSettings(
            browserBinaryPath="",
            browserUserDataDir="",
            useOwnBrowser=False,
            keepBrowserOpen=True,
            headless=False,
            disableSecurity=False,
            cdpUrl="http://127.0.0.1:9222",
            windowWidth=1440,
            windowHeight=900,
            allowedDomains=["shamyli.com", "*.shamyli.com"],
            prohibitedDomains=["example.com"],
            blockIpAddresses=True,
            saveRecordingPath="./tmp/recordings",
            tracePath="./tmp/traces",
            saveDownloadPath="./tmp/downloads",
            saveAgentHistoryPath=str(Path(tmp_dir) / "agent_history"),
        )

        browser_session = build_browser_session(settings)
        profile = browser_session.browser_profile

        assert profile.cdp_url == "http://127.0.0.1:9222"
        assert profile.keep_alive is True
        assert profile.headless is False
        assert profile.disable_security is False
        assert profile.window_size is not None
        assert profile.window_size.width == 1440
        assert profile.window_size.height == 900
        assert profile.allowed_domains == ["shamyli.com", "*.shamyli.com"]
        assert profile.prohibited_domains == ["example.com"]
        assert profile.block_ip_addresses is True
        assert str(profile.record_video_dir).replace("\\", "/").endswith("tmp/recordings")
        assert str(profile.traces_dir).replace("\\", "/").endswith("tmp/traces")
        assert str(profile.downloads_path).replace("\\", "/").endswith("tmp/downloads")

        api_shape = browser_settings_snapshot(settings)
        assert api_shape["keepBrowserOpen"] is True
        assert api_shape["cdpUrl"] == "http://127.0.0.1:9222"
        assert api_shape["windowWidth"] == 1440
        assert api_shape["windowHeight"] == 900
        assert api_shape["allowedDomains"] == ["shamyli.com", "*.shamyli.com"]
        assert api_shape["prohibitedDomains"] == ["example.com"]
        assert api_shape["blockIpAddresses"] is True
        assert api_shape["saveRecordingPath"] == "./tmp/recordings"
        assert api_shape["tracePath"] == "./tmp/traces"
        assert api_shape["saveDownloadPath"] == "./tmp/downloads"
        assert api_shape["saveAgentHistoryPath"].replace("\\", "/").endswith("agent_history")

        local_session = LocalSession(
            id="session-smoke",
            browser=browser_session,
            model_spec="ollama::smoke",
            llm_settings=llm_settings,
            browser_settings=settings,
        )
        history_path, gif_path = session_artifact_paths(local_session, "run-smoke")
        assert history_path.parent.exists()
        assert history_path.name == "run-smoke.json"
        assert gif_path.name == "run-smoke.gif"

        inspect_tools = build_session_tools(local_session, lambda _: None, "inspect")
        inspect_action_names = set(inspect_tools.registry.registry.actions)
        for action_name in INSPECT_EXCLUDED_ACTIONS:
            assert action_name not in inspect_action_names, f"Inspect mode unexpectedly exposes {action_name}"
        assert "ask_for_assistant" in inspect_action_names

        full_tools = build_session_tools(local_session, lambda _: None, "full")
        full_action_names = set(full_tools.registry.registry.actions)
        for action_name in INSPECT_EXCLUDED_ACTIONS:
            assert action_name in full_action_names, f"Full-control mode is missing native action {action_name}"
        assert "ask_for_assistant" in full_action_names

    default_browser = BrowserSettings()
    assert default_browser.allowed_domains == []
    assert default_browser.prohibited_domains == []
    assert default_browser.block_ip_addresses is False

    mcp_server = MCPServerSettings(
        name="filesystem",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", "./tmp"],
        envKeys=["SHAMYLI_MCP_TEST_TOKEN"],
        toolFilter=["read_file"],
        prefix="fs_",
    )
    run = RunRequest(
        task="smoke",
        interactionMode="full",
        maxSteps=12,
        maxActionsPerStep=3,
        useVision=False,
        generateGif=True,
        enablePlanning=True,
        planningReplanOnStall=4,
        planningExplorationLimit=7,
        overrideSystemPrompt="override smoke",
        extendSystemPrompt="extend smoke",
        mcpServers=[mcp_server.model_dump(by_alias=True)],
    )
    assert run.interaction_mode == "full"
    assert RunRequest(task="default safety").interaction_mode == "inspect"
    assert RunRequest(task="default mcp").mcp_servers == []
    assert run.max_steps == 12
    assert run.max_actions_per_step == 3
    assert run.use_vision is False
    assert run.generate_gif is True
    assert run.enable_planning is True
    assert run.planning_replan_on_stall == 4
    assert run.planning_exploration_limit == 7
    assert run.override_system_prompt == "override smoke"
    assert run.extend_system_prompt == "extend smoke"
    assert len(run.mcp_servers) == 1
    assert run.mcp_servers[0].name == "filesystem"
    assert run.mcp_servers[0].env_keys == ["SHAMYLI_MCP_TEST_TOKEN"]
    assert run.model_dump(by_alias=True)["mcpServers"][0]["toolFilter"] == ["read_file"]

    native_agent_params = signature(Agent.__init__).parameters
    for name in (
        "use_vision",
        "max_actions_per_step",
        "generate_gif",
        "enable_planning",
        "planning_replan_on_stall",
        "planning_exploration_limit",
        "override_system_message",
        "extend_system_message",
    ):
        assert name in native_agent_params, f"Browser Use Agent no longer exposes native parameter: {name}"
    assert hasattr(Agent, "save_history"), "Browser Use Agent.save_history() is no longer available"

    print("SHAMYLI settings adapter smoke: PASS")


if __name__ == "__main__":
    main()
