# SHAMYLI Browser Agent — Reuse-First Integration Map

## Non-negotiable rule

Do **not** invent a new feature implementation when Browser Use already ships a tested implementation in one of these sources:

1. `browser-use/chat-ui-example` — modern Next.js/React/Tailwind UX.
2. `browser-use/web-ui` — mature local/self-hosted browser + agent controls.
3. `browser-use/browser-use` — official core runtime, browser/session logic, native LLM providers, and native MCP support.

New SHAMYLI code is allowed only for the **smallest adapter/glue layer** required to connect incompatible stacks (React/TypeScript frontend ↔ Python Browser Use runtime) or for SHAMYLI-specific safety policy that does not exist upstream.

---

## Source of truth by feature

| Feature | Reuse from | Existing upstream implementation | SHAMYLI action |
|---|---|---|---|
| Modern chat shell | `chat-ui-example` | Next.js/React/Tailwind session UI | Reuse |
| Session page | `chat-ui-example` | Modern session layout | Reuse |
| Browser panel UX | `chat-ui-example` | Right-side browser panel / `liveUrl` concept | Reuse UI |
| Follow-up task UX | `chat-ui-example` | Same-session follow-up flow | Reuse |
| Stop task UX | `chat-ui-example` + core | Stop control + native `Agent.stop()` | Reuse |
| Model/profile/workspace UX | `chat-ui-example` | Existing selectors/settings patterns | Reuse UI; replace Cloud calls only |
| Local Browser Use execution | `browser-use` core | `Agent`, `BrowserSession` | Reuse directly |
| Native LLM providers | `browser-use` core | OpenRouter, Groq, OpenAI, Anthropic, Google, Ollama, etc. | Reuse directly; no provider reimplementation |
| Browser binary path | `web-ui` + current `BrowserProfile` | Browser settings semantics | Port setting through thin mapping |
| Browser user-data dir | `web-ui` + current `BrowserProfile` | Persistent profile semantics | Port setting through thin mapping |
| Use Own Browser | `web-ui` + current `BrowserProfile` | Existing behavior | Reuse semantics |
| Keep Browser Open | `web-ui` + current `BrowserProfile.keep_alive` | Existing behavior | Reuse semantics |
| Headless / security | `web-ui` + current `BrowserProfile` | Current profile fields | Reuse |
| CDP URL | `web-ui` + current `BrowserProfile.cdp_url` | Existing browser attach path | Reuse |
| WSS URL | legacy `web-ui` only | No verified current 0.13.10 native field | Do not port / do not invent |
| Window width/height | `web-ui` + current `BrowserProfile.window_size` | Current profile field | Reuse |
| Recording / trace / downloads | `web-ui` + current Browser Use profile fields | Current paths | Reuse |
| Agent history | Browser Use core | `Agent.save_history()` | Reuse directly |
| Agent max steps/actions | `web-ui` + current `Agent` | Current run/constructor controls | Reuse |
| Legacy max input tokens | old `web-ui` | No verified current Agent constructor equivalent | Do not port / do not invent |
| Use Vision | `web-ui` / core | Native Agent setting | Reuse |
| Legacy tool calling method | old `web-ui` | No verified current Agent constructor equivalent | Do not port / do not invent |
| Planning | Browser Use core | Native built-in planning fields | Reuse; do not recreate separate planner LLM |
| Pause / Resume | `web-ui` + Browser Use core | Native `agent.pause()` / `agent.resume()` | Reuse |
| Ask-for-assistance | `web-ui` pattern + current `Tools` / `ActionResult` | Proven wait/resume UX pattern | Port only thin callback bridge |
| MCP external servers | Browser Use 0.13.10 core | `browser_use.mcp.client.MCPClient.register_to_tools()` | Reuse native client; retire old custom LangChain bridge |
| Browser Use as MCP server | Browser Use 0.13.10 core | `browser_use.mcp.server`, `browser-use --mcp` | Preserve as separate interoperability mode |
| MCP protocol dependency | Browser Use 0.13.10 core | pinned `mcp==2.1.1` | Reuse; no second MCP stack |
| Per-step screenshots | Browser Use core / old Web UI presentation | Native state/screenshot APIs | Reuse; do not invent screenshot engine |
| Live browser via noVNC | `web-ui` Docker stack | Xvfb + x11vnc + noVNC | Reuse |
| Browser state/screenshots | `browser-use` core | `BrowserSession` APIs | Reuse only when noVNC is not suitable |

---

## Important upstream files already verified

### `browser-use/web-ui`

- `src/webui/components/browser_settings_tab.py`
  - Browser Binary Path
  - Browser User Data Dir
  - Use Own Browser
  - Keep Browser Open
  - Headless Mode
  - Disable Security
  - Window width/height
  - CDP / legacy WSS controls
  - Recording / trace / history / download paths

- `src/webui/components/browser_use_agent_tab.py`
  - LLM/provider settings semantics
  - Browser settings retrieval
  - Agent lifecycle
  - Per-step screenshot handling
  - Stop / Pause / Resume controls
  - User-assistance callback
  - legacy MCP config UX
  - legacy planner/max-token/tool-calling fields that must not be blindly copied to the current runtime

- `Dockerfile`, `supervisord.conf`, `docker-compose.yml`
  - x11vnc / TigerVNC / noVNC stack
  - browser observation path already implemented upstream

### `browser-use/chat-ui-example`

- modern Next.js/React/Tailwind chat/session components are the UI base;
- its API boundary is replaced by the thin localhost adapter, not by rewriting the UI.

### `browser-use/browser-use` 0.13.10

- official `Agent`, `BrowserSession`, `BrowserProfile`;
- native provider classes;
- browser/session/CDP implementation;
- native `Tools` registry and action exclusion;
- native planning/history/GIF/screenshot behavior;
- pinned `mcp==2.1.1`;
- `browser_use.mcp.client.MCPClient` for external MCP servers;
- `browser_use.mcp.server` + `browser-use --mcp` for exposing Browser Use as an MCP server.

---

## What we keep custom

Only a small local API adapter is justified because the official UI/runtime layers use different stacks:

```text
Next.js Chat UI
      ↓
small localhost adapter
      ↓
Browser Use Python runtime
```

The adapter may translate:

- create session;
- run/follow-up task;
- stream step events;
- stop/pause/resume;
- browser settings from UI to existing Browser Use objects;
- model/provider selection to existing Browser Use provider classes;
- live-view URL when using the reused noVNC stack;
- structured non-secret MCP configuration into native `MCPClient`;
- SHAMYLI-specific safety policy such as Inspect Only.

It must **not** duplicate Browser Use browser logic, provider logic, screenshot logic, profile logic, automation actions, MCP protocol/transport, or MCP schema/action registration.

---

## Current SHAMYLI-specific safety layer

- `Inspect Only` is the default.
- It excludes native Browser Use `click`, `input`, `upload_file`, `send_keys`, and `select_dropdown` actions.
- It also starts/registers **zero** external MCP tools because an arbitrary MCP server may define state-changing actions.
- Full Browser Control is explicit and restores native interactions plus explicitly configured MCP servers.
- MCP UI/exported configuration stores environment-variable names only. Secret values are resolved locally.
- MCP subprocesses receive only minimal process environment plus explicitly allow-listed variable names, not the entire backend environment.

---

## Current implementation order

1. Keep the modern Chat UI intact.
2. Reuse current Browser Use browser/profile/provider/Agent APIs through the thin adapter.
3. Reuse the old Web UI noVNC stack for live browser observation.
4. Reuse native pause/resume/stop, history, GIF, planning, and Browser Use MCP support.
5. Add only the project-specific Inspect/Full safety boundary and secret-isolation glue not supplied upstream.
6. Do not promote the Draft PR until the newest complete CI run is green.

## Test policy

- Prefer upstream-tested behavior unchanged.
- Every adapter change must be small and isolated.
- CI must cover frontend build, backend import/contracts, MCP safety/registration, Docker/noVNC startup, and real local-browser smoke on Ubuntu/Windows before asking the user to act as the test environment.
- Integration changes stay on `shamyli/chat-ui-local-base` until stable.
- No production WordPress writes during integration testing.
