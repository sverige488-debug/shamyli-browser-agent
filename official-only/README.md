# SHAMYLI official-only experiment

This branch intentionally contains **no custom browser-agent runtime**.

It tests how far the project can go by composing only maintained upstream products and their documented configuration surfaces:

1. **Browser Use 0.13.10** — official local browser/MCP runtime.
2. **MCPO 0.0.20** — official Open WebUI MCP-to-OpenAPI bridge for stdio MCP servers.
3. **Open WebUI 0.11.3** — official chat/model/tool UI.

The only files added here are configuration, documentation, and CI verification. There is no SHAMYLI FastAPI server, no custom browser engine, no custom tool executor, no custom MCP protocol code, and no custom chat UI.

## Why this path exists

Browser Use 0.13.10 already ships an MCP server (`browser-use --mcp`) with browser navigation, click/type, page state, extraction, HTML, screenshots, scrolling, tab/session management, and an agent fallback tool.

Open WebUI natively supports Streamable HTTP MCP. Its documentation recommends **MCPO** for stdio MCP servers. MCPO starts the stdio server, discovers its MCP tools, and exposes them as ordinary OpenAPI endpoints without a custom adapter.

That gives this official-only chain:

```text
Open WebUI
   ↓ OpenAPI tool server
MCPO 0.0.20
   ↓ stdio MCP
Browser Use 0.13.10 --mcp
   ↓
Browser Use browser/session runtime
```

## Exact pinned versions

- Browser Use: `0.13.10`
- MCPO: `0.0.20`
- Open WebUI: `v0.11.3`

Pinned releases are used instead of floating `main` tags so the experiment is reproducible.

## One-time Browser Use browser install

Browser Use documents its own installer. With `uv` available:

```powershell
uvx --from "browser-use[cli]==0.13.10" browser-use install
```

This is Browser Use's installer; this project does not install or manage Chromium itself.

## Start the official bridge — Inspect profile

The Inspect MCPO config disables Browser Use MCP tools that directly click/type, close browser resources, or hand the task to the autonomous fallback agent.

```powershell
uvx --from "mcpo==0.0.20" mcpo --host 127.0.0.1 --port 8000 --api-key "CHANGE-ME" --config .\official-only\mcpo-inspect.json
```

MCPO mounts the Browser Use server at:

```text
http://127.0.0.1:8000/browser_use
```

Its generated OpenAPI schema is:

```text
http://127.0.0.1:8000/browser_use/openapi.json
```

### Inspect profile tools kept available

The upstream MCP server can still expose read/observe and local-navigation tools such as page state, extraction, HTML, screenshot, scrolling, tab listing/switching, session listing, navigation and back.

The config disables:

- `browser_click`
- `browser_type`
- `browser_close_tab`
- `browser_close_session`
- `browser_close_all`
- `retry_with_browser_use_agent`

This is an upstream-tool filter, not a new safety engine. Navigation itself is not guaranteed side-effect-free on every website.

## Start the official bridge — Full profile

```powershell
uvx --from "mcpo==0.0.20" mcpo --host 127.0.0.1 --port 8001 --api-key "CHANGE-ME" --config .\official-only\mcpo-full.json
```

The Full profile exposes the complete Browser Use MCP tool list discovered by MCPO.

## Open WebUI

If Open WebUI is not already running, its official Docker documentation supports a pinned release image. Generate and keep a stable `WEBUI_SECRET_KEY`, then run:

```powershell
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data -e WEBUI_SECRET_KEY="CHANGE-ME-TO-A-STABLE-SECRET" --name open-webui --restart always ghcr.io/open-webui/open-webui:v0.11.3
```

Because MCPO is running on the Windows host, a personal/user OpenAPI tool connection can use localhost from the browser. If configuring the tool server from an Open WebUI backend running in Docker, use the host address appropriate to that Docker setup (for example `host.docker.internal`) instead of assuming container localhost is the Windows host.

In Open WebUI, connect the MCPO endpoint as an **OpenAPI tool server**, not as native MCP. MCPO is already the MCP-to-OpenAPI bridge.

Use the server path itself, for example:

```text
http://127.0.0.1:8000/browser_use
```

and provide the MCPO API key as required by the Open WebUI connection settings.

## No-code controls available in Open WebUI

The official UI can provide additional policy without SHAMYLI runtime code:

- Function Name Filter List to restrict tools shown to the model.
- Per-chat enabling/disabling of external tool servers.
- Experimental **Ask for approval** tool-permission mode, which pauses before tool execution for Allow/Deny.
- Built-in **Ask User** capability for human clarification when enabled for the selected model.

For a conservative setup, keep the Inspect bridge as the normal connection and enable the Full bridge only when an interactive task is intended. `Ask for approval` can be enabled as another independent guard.

## What this official-only route gives naturally

Without a SHAMYLI runtime implementation, we get:

- modern chat UI and model selection from Open WebUI;
- Browser Use's current browser/session implementation;
- MCP tool discovery and execution from Browser Use;
- OpenAPI translation and automatic schemas from MCPO;
- page state, HTML/content extraction, screenshots, scrolling, navigation, click/type, tabs and sessions depending on which config is enabled;
- Open WebUI tool filtering and approval UX;
- Browser Use's own headed browser/profile behavior and configuration;
- no custom protocol or tool-execution layer to maintain.

## Natural stopping point

The official-only path does **not** automatically reproduce every SHAMYLI-specific UX feature from the separate modern Next.js integration, such as the embedded noVNC browser panel, SHAMYLI-specific status cards, bespoke session artifact buttons, or project-specific WordPress approval policy.

Those are the exact places where we should decide whether the upstream experience is already sufficient. Only gaps that materially matter should justify any custom adapter later.

## Verification rule

This experiment is not declared successful merely because all three projects are official. CI must first prove that the pinned Browser Use MCP server and pinned MCPO version start together and that MCPO generates the expected filtered/full OpenAPI tool surfaces.
