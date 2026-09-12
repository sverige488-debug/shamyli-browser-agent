from __future__ import annotations

import asyncio
import json
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from browser_use import (
    Agent,
    BrowserProfile,
    BrowserSession,
    ChatAnthropic,
    ChatGoogle,
    ChatGroq,
    ChatOllama,
    ChatOpenAI,
    ChatOpenRouter,
)

# Reuse the environment variable names already shipped by Browser Use Web UI.
# Root .env is the primary configuration file; local_backend/.env can override
# only variables that are not already present in the process/root file.
ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env", override=False)
load_dotenv(Path(__file__).with_name(".env"), override=False)

app = FastAPI(title="SHAMYLI Browser Agent Local API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateSessionRequest(BaseModel):
    model: str = "openrouter::anthropic/claude-sonnet-4-6"


class RunRequest(BaseModel):
    task: str = Field(min_length=1)
    max_steps: int = Field(default=25, ge=1, le=100)


@dataclass
class LocalSession:
    id: str
    browser: BrowserSession
    model_spec: str
    status: str = "created"
    agent: Agent | None = None


sessions: dict[str, LocalSession] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def parse_model_spec(spec: str) -> tuple[str, str]:
    if "::" not in spec:
        raise ValueError("Model must use provider::model format")
    provider, model = spec.split("::", 1)
    provider = provider.strip().lower()
    model = model.strip()
    if not provider or not model:
        raise ValueError("Provider and model are required")
    return provider, model


def build_llm(spec: str):
    """Thin selector over Browser Use's native, tested provider classes."""
    provider, model = parse_model_spec(spec)
    if provider == "openrouter":
        return ChatOpenRouter(model=model)
    if provider == "groq":
        return ChatGroq(model=model)
    if provider == "openai":
        return ChatOpenAI(model=model)
    if provider == "anthropic":
        return ChatAnthropic(model=model, temperature=0.0)
    if provider in {"google", "gemini"}:
        return ChatGoogle(model=model)
    if provider == "ollama":
        return ChatOllama(model=model, num_ctx=32000)
    raise ValueError(f"Unsupported provider: {provider}")


def build_browser_session() -> BrowserSession:
    """Map the existing Browser Use Web UI browser settings onto current BrowserProfile."""
    keep_alive = env_bool("KEEP_BROWSER_OPEN", True)
    use_own_browser = env_bool("USE_OWN_BROWSER", False)
    headless = env_bool("BROWSER_HEADLESS", False)
    disable_security = env_bool("DISABLE_SECURITY", False)
    width = env_int("RESOLUTION_WIDTH", 1920)
    height = env_int("RESOLUTION_HEIGHT", 1080)

    cdp_url = (os.getenv("BROWSER_CDP") or "").strip() or None
    browser_path = (os.getenv("BROWSER_PATH") or "").strip() or None
    user_data_dir = (os.getenv("BROWSER_USER_DATA") or "").strip() or None

    profile_kwargs: dict[str, Any] = {
        "headless": headless,
        "disable_security": disable_security,
        "keep_alive": keep_alive,
        "window_size": {"width": width, "height": height},
    }

    # Current Browser Use core natively supports CDP, executable_path and
    # user_data_dir. We only translate the old Web UI setting names here.
    if cdp_url:
        profile_kwargs["cdp_url"] = cdp_url
    elif use_own_browser:
        if browser_path:
            profile_kwargs["executable_path"] = browser_path
        if user_data_dir:
            profile_kwargs["user_data_dir"] = user_data_dir

    return BrowserSession(browser_profile=BrowserProfile(**profile_kwargs))


def browser_settings_snapshot() -> dict[str, Any]:
    return {
        "keepBrowserOpen": env_bool("KEEP_BROWSER_OPEN", True),
        "useOwnBrowser": env_bool("USE_OWN_BROWSER", False),
        "headless": env_bool("BROWSER_HEADLESS", False),
        "disableSecurity": env_bool("DISABLE_SECURITY", False),
        "browserPathConfigured": bool((os.getenv("BROWSER_PATH") or "").strip()),
        "browserUserDataConfigured": bool((os.getenv("BROWSER_USER_DATA") or "").strip()),
        "cdpConfigured": bool((os.getenv("BROWSER_CDP") or "").strip()),
        "windowWidth": env_int("RESOLUTION_WIDTH", 1920),
        "windowHeight": env_int("RESOLUTION_HEIGHT", 1080),
    }


def message(role: str, data: dict[str, Any], message_id: str | None = None) -> dict[str, Any]:
    return {
        "id": message_id or str(uuid.uuid4()),
        "role": role,
        "data": json.dumps(data, ensure_ascii=False),
        "createdAt": now_iso(),
        "hidden": False,
    }


def action_to_tool_calls(output: Any, step: int) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    actions = getattr(output, "action", None) or []
    for index, action in enumerate(actions):
        try:
            raw = action.model_dump(exclude_none=True)
        except Exception:
            raw = {}
        if not raw:
            continue
        name, args = next(iter(raw.items()))
        if args is None:
            args = {}
        if not isinstance(args, dict):
            args = {"value": args}
        calls.append(
            {
                "id": f"step-{step}-tool-{index}",
                "type": "function",
                "function": {
                    "name": str(name),
                    "arguments": json.dumps(args, ensure_ascii=False, default=str),
                },
            }
        )
    return calls


@app.get("/health")
async def health():
    return {
        "ok": True,
        "mode": "local",
        "browserUseCloudRequired": False,
        "browserSettings": browser_settings_snapshot(),
    }


@app.get("/models")
async def models():
    return {
        "presets": [
            {"value": "openrouter::anthropic/claude-sonnet-4-6", "label": "OpenRouter · Claude Sonnet 4.6"},
            {"value": "groq::meta-llama/llama-4-maverick-17b-128e-instruct", "label": "Groq · Llama 4 Maverick"},
            {"value": "openai::gpt-5", "label": "OpenAI · GPT-5"},
            {"value": "anthropic::claude-sonnet-4-6", "label": "Anthropic · Claude Sonnet 4.6"},
            {"value": "google::gemini-2.5-flash", "label": "Google · Gemini 2.5 Flash"},
            {"value": "ollama::llama3", "label": "Ollama · llama3"},
        ]
    }


@app.post("/sessions")
async def create_session(body: CreateSessionRequest):
    try:
        parse_model_spec(body.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session_id = str(uuid.uuid4())
    sessions[session_id] = LocalSession(
        id=session_id,
        browser=build_browser_session(),
        model_spec=body.model,
    )
    return {"id": session_id, "liveUrl": None, "status": "created"}


@app.get("/sessions/{session_id}/screenshot")
async def session_screenshot(session_id: str):
    """Reuse BrowserSession.take_screenshot(), the same capability used by Web UI/core."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "created":
        return Response(status_code=204, headers={"Cache-Control": "no-store"})

    try:
        data = await session.browser.take_screenshot(full_page=False)
    except Exception:
        return Response(status_code=204, headers={"Cache-Control": "no-store"})

    if not data:
        return Response(status_code=204, headers={"Cache-Control": "no-store"})
    return Response(
        content=data,
        media_type="image/png",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@app.post("/sessions/{session_id}/run")
async def run_session(session_id: str, body: RunRequest):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status in {"running", "paused"}:
        raise HTTPException(status_code=409, detail="Session is already running")

    async def event_stream():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        loop = asyncio.get_running_loop()
        session.status = "running"

        await queue.put(message("user", {"content": body.task}))

        def emit(item: dict[str, Any] | None) -> None:
            # Browser Use callbacks may be invoked outside the request coroutine.
            loop.call_soon_threadsafe(queue.put_nowait, item)

        def on_step(state: Any, output: Any, step: int):
            tool_calls = action_to_tool_calls(output, step)
            thought = ""
            current_state = getattr(output, "current_state", None)
            if current_state is not None:
                thought = str(getattr(current_state, "next_goal", "") or "")
            if not thought:
                thought = f"Step {step}"

            assistant_id = f"step-{step}-assistant"
            emit(
                message(
                    "assistant",
                    {"content": thought, "tool_calls": tool_calls},
                    assistant_id,
                )
            )
            for call in tool_calls:
                emit(
                    message(
                        "tool",
                        {"tool_call_id": call["id"], "content": "Completed"},
                        f"{call['id']}-result",
                    )
                )

        async def runner():
            try:
                llm = build_llm(session.model_spec)
                agent = Agent(
                    task=body.task,
                    llm=llm,
                    browser_session=session.browser,
                    register_new_step_callback=on_step,
                    use_vision=True,
                )
                session.agent = agent
                history = await agent.run(max_steps=body.max_steps)
                final = history.final_result() or "Task completed."
                await queue.put(message("assistant", {"content": str(final)}))
                session.status = "idle"
                await queue.put({"__done": True, "id": session.id, "liveUrl": None, "status": "idle"})
            except asyncio.CancelledError:
                session.status = "stopped"
                await queue.put({"__done": True, "id": session.id, "liveUrl": None, "status": "stopped"})
                raise
            except Exception as exc:
                session.status = "error"
                await queue.put({"__error": True, "message": str(exc)})
                await queue.put({"__done": True, "id": session.id, "liveUrl": None, "status": "error"})
            finally:
                session.agent = None
                await queue.put(None)

        task = asyncio.create_task(runner())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield f"data: {json.dumps(item, ensure_ascii=False, default=str)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/sessions/{session_id}/pause")
async def pause_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.agent is None or session.status != "running":
        raise HTTPException(status_code=409, detail="No running agent to pause")
    session.agent.pause()
    session.status = "paused"
    return {"ok": True, "status": session.status}


@app.post("/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.agent is None or session.status != "paused":
        raise HTTPException(status_code=409, detail="No paused agent to resume")
    session.agent.resume()
    session.status = "running"
    return {"ok": True, "status": session.status}


@app.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.agent is not None:
        session.agent.stop()
    session.status = "stopped"
    return {"ok": True, "status": session.status}


@app.delete("/sessions/{session_id}")
async def close_session(session_id: str):
    session = sessions.pop(session_id, None)
    if not session:
        return {"ok": True}
    try:
        await session.browser.kill()
    except Exception:
        pass
    return {"ok": True}


@app.get("/profiles")
async def profiles():
    return []


@app.get("/workspaces")
async def workspaces():
    return []


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
