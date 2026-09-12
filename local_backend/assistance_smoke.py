"""Contract smoke for the reused Web UI human-assistance pattern on Browser Use 0.13.10.

No LLM, network, or browser launch is required. This verifies that the legacy
`ask_for_assistant` behavior can run through the current native Tools registry,
wait for a human response, and resume cleanly.
"""

import asyncio

from app import (
    AssistanceResponseRequest,
    LocalSession,
    build_browser_session,
    build_session_tools,
    default_browser_settings,
    sessions,
    submit_assistance_response,
)


async def main() -> None:
    session = LocalSession(
        id="assistance-smoke",
        browser=build_browser_session(default_browser_settings()),
        model_spec="ollama::smoke",
        browser_settings=default_browser_settings(),
    )
    sessions[session.id] = session
    emitted: list[dict] = []

    tools = build_session_tools(session, lambda item: emitted.append(item) if item is not None else None)
    action = tools.registry.registry.actions.get("ask_for_assistant")
    assert action is not None, "ask_for_assistant was not registered in current Tools"

    params = action.param_model(query="Please confirm the manual step is complete.")
    pending = asyncio.create_task(action.function(params=params))

    for _ in range(100):
        if session.status == "waiting_for_user" and session.assistance_event is not None:
            break
        await asyncio.sleep(0.01)

    assert session.status == "waiting_for_user"
    assert session.assistance_question == "Please confirm the manual step is complete."
    assert any(item.get("__assistance") for item in emitted)

    result = await submit_assistance_response(
        session.id,
        AssistanceResponseRequest(response="Done — continue."),
    )
    assert result["ok"] is True

    action_result = await asyncio.wait_for(pending, timeout=2.0)
    assert session.status == "running"
    assert "Done — continue." in (action_result.extracted_content or "")
    assert any(item.get("__assistance_resolved") for item in emitted)

    sessions.pop(session.id, None)
    print("SHAMYLI human assistance smoke: PASS")


if __name__ == "__main__":
    asyncio.run(main())
