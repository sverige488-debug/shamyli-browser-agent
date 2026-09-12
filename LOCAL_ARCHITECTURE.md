# SHAMYLI Browser Agent — Local architecture

This branch combines existing open-source building blocks instead of rebuilding them:

1. **Browser Use Chat UI Example** — modern Next.js/React/Tailwind chat + live-browser UX.
2. **Browser Use Web UI** — proven local browser settings, persistent-browser behavior, and Xvfb/x11vnc/noVNC observation stack.
3. **Browser Use open-source core 0.13.10** — local browser automation, `Agent`, `BrowserSession`, `BrowserProfile`, native provider classes, and native MCP client/server support.

The only custom layer is a small localhost API adapter between the Next.js UI and the Python Browser Use runtime, plus the SHAMYLI-specific Inspect/Full safety policy.

## Local topology

```text
Modern Next.js UI (127.0.0.1:3000)
           |
           v
Thin FastAPI adapter (127.0.0.1:8000)
           |
           v
Browser Use core
           |
           +--> Native Windows Chromium / own browser / CDP
           |
           +--> Docker Xvfb browser --> x11vnc --> noVNC (127.0.0.1:6080)
           |
           +--> native MCPClient --> explicitly configured external stdio MCP servers
           |
           v
Selected native Browser Use LLM provider
```

No Browser Use Cloud API is required for local execution.

## Browser settings

The modern UI exposes the browser controls already proven in Browser Use Web UI and passes them through the adapter to `BrowserProfile`:

- Browser Binary Path
- Browser User Data Dir
- Use Own Browser
- Keep Browser Open
- Headless Mode
- Disable Security
- CDP URL
- Window width / height
- recording, trace, download, and agent-history paths

The adapter does not reimplement browser launch, CDP, profile reuse, keep-alive, screenshots, history serialization, or browser automation behavior.

## MCP integration

Browser Use 0.13.10 already provides native MCP support, so SHAMYLI reuses it instead of porting the legacy LangChain MCP bridge.

### External MCP tools

The modern UI stores only non-secret configuration:

- server name;
- command;
- command arguments;
- enabled state;
- optional action prefix;
- optional tool allow-list;
- environment-variable **names**.

At run time the backend resolves only those explicitly named environment variables and passes a least-privilege environment to the MCP subprocess. Unrelated backend variables and provider API keys are not inherited automatically. The backend then uses `browser_use.mcp.client.MCPClient.register_to_tools()` to register external tools into the same native Browser Use `Tools` registry used by the Agent.

External MCP clients are scoped to one run and disconnected in cleanup.

### Browser Use as an MCP server

Browser Use also exposes its own MCP server through `browser_use.mcp.server` / `browser-use --mcp`. This is kept as a separate optional interoperability path. SHAMYLI does not start a redundant MCP server inside the normal chat runtime because the local adapter already calls Browser Use directly.

## Interaction safety

### Inspect Only — default

- native Browser Use `click`, `input`, `upload_file`, `send_keys`, and `select_dropdown` actions are absent from the run's `Tools` registry;
- external MCP servers are not started and their tools are not registered;
- direct navigation, reading/extraction/search, scrolling, screenshots, and human assistance remain available;
- a fixed policy reminder is appended to the Agent system message.

External MCP tools are fully suppressed in Inspect Only because SHAMYLI cannot infer whether an arbitrary server-defined tool has side effects.

### Full Browser Control

Full mode restores Browser Use's normal native interaction actions and permits explicitly configured MCP servers. It is opt-in and should be used only when the user intentionally wants the agent to interact with or modify the active environment.

## Run modes

### Native Windows browser

Use this when you want Browser Use to run directly on the PC. The browser panel falls back to BrowserSession screenshots.

```powershell
.\scripts\setup-windows.ps1
.\scripts\start-windows.ps1
```

### Docker + reused noVNC live browser

Use this when you want the existing Browser Use Web UI live-browser stack embedded into the modern browser panel.

```powershell
.\scripts\setup-windows.ps1
.\scripts\start-docker-browser.ps1
```

The Docker launcher starts the local adapter, Xvfb, x11vnc, noVNC, then the modern Next.js UI. The default VNC password is only a local development default and can be overridden with `VNC_PASSWORD`.

## Safety baseline

- Native Windows services bind to `127.0.0.1` by default.
- Docker publishes only explicitly listed development ports on the local machine.
- Never commit API keys, WordPress passwords, cookies, or session data.
- UI settings/export files never store provider API-key values or MCP environment-variable values.
- MCP subprocesses receive only explicitly allow-listed secrets, not the full backend environment.
- Integration features stay isolated on `shamyli/chat-ui-local-base` until the Draft PR passes the complete CI matrix.
- No production WordPress write testing is part of the integration batch.
