"""Fast contract smoke tests for the thin modern-UI -> Browser Use adapters.

This intentionally does not launch a browser. The real browser launch is already
covered by browser_smoke.py on Windows and Ubuntu. Here we verify that modern UI
contracts translate into Browser Use 0.13.10 native profile/agent fields.
"""

import tempfile
from inspect import signature
from pathlib import Path

from browser_use import Agent

from app import (
    BrowserSettings,
    LocalSession,
    RunRequest,
    browser_settings_snapshot,
    build_browser_session,
    session_artifact_paths,
)


def main() -> None:
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
        assert str(profile.record_video_dir).replace("\\", "/").endswith("tmp/recordings")
        assert str(profile.traces_dir).replace("\\", "/").endswith("tmp/traces")
        assert str(profile.downloads_path).replace("\\", "/").endswith("tmp/downloads")

        api_shape = browser_settings_snapshot(settings)
        assert api_shape["keepBrowserOpen"] is True
        assert api_shape["cdpUrl"] == "http://127.0.0.1:9222"
        assert api_shape["windowWidth"] == 1440
        assert api_shape["windowHeight"] == 900
        assert api_shape["saveRecordingPath"] == "./tmp/recordings"
        assert api_shape["tracePath"] == "./tmp/traces"
        assert api_shape["saveDownloadPath"] == "./tmp/downloads"
        assert api_shape["saveAgentHistoryPath"].replace("\\", "/").endswith("agent_history")

        local_session = LocalSession(
            id="session-smoke",
            browser=browser_session,
            model_spec="ollama::smoke",
            browser_settings=settings,
        )
        history_path, gif_path = session_artifact_paths(local_session, "run-smoke")
        assert history_path.parent.exists()
        assert history_path.name == "run-smoke.json"
        assert gif_path.name == "run-smoke.gif"

    run = RunRequest(
        task="smoke",
        maxSteps=12,
        maxActionsPerStep=3,
        useVision=False,
        generateGif=True,
        enablePlanning=True,
        planningReplanOnStall=4,
        planningExplorationLimit=7,
        overrideSystemPrompt="override smoke",
        extendSystemPrompt="extend smoke",
    )
    assert run.max_steps == 12
    assert run.max_actions_per_step == 3
    assert run.use_vision is False
    assert run.generate_gif is True
    assert run.enable_planning is True
    assert run.planning_replan_on_stall == 4
    assert run.planning_exploration_limit == 7
    assert run.override_system_prompt == "override smoke"
    assert run.extend_system_prompt == "extend smoke"

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
