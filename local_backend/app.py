from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from browser_use import (
    Agent,
    BrowserSession,
    ChatAnthropic,
    ChatGoogle,
    ChatGroq,
    ChatOllama,
    ChatOpenAI,
    ChatOpenRouter,
)

app = FastAPI(title="SHAMYLI Browser Agent Local API", version="0.1.0")
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
    return {"ok": True, "mode": "local", "browserUseCloudRequired": False}


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
        browser=BrowserSession(),
        model_spec=body.model,
    )
    return {"id": session_id, "liveUrl": None, "status": "created"}


@app.post("/sessions/{session_id}/run")
async def run_session(session_id: str, body: RunRequest):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "running":
        raise HTTPException(status_code=409, detail="Session is already running")

    async def event_stream():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        loop = asyncio.get_running_loop()
        session.status = "running"

        await queue.put(message("user", {"content": body.task}))

        def emit(item: dict[str, Any] | None) -> None:
            # Browser Use callbacks may be invoked outside the request coroutine.
            # Marshal queue writes back onto the FastAPI event loop safely.
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
