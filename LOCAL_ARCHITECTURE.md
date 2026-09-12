# SHAMYLI Browser Agent — Local architecture

This branch combines existing open-source building blocks instead of rebuilding them:

1. **Browser Use Chat UI Example** — modern Next.js/React/Tailwind chat + live-browser UX.
2. **Browser Use Web UI** — proven local browser settings, persistent-browser behavior, and Xvfb/x11vnc/noVNC observation stack.
3. **Browser Use open-source core** — local browser automation, `Agent`, `BrowserSession`, `BrowserProfile`, and native provider classes.

The only custom layer is a small localhost API adapter between the Next.js UI and the Python Browser Use runtime.

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

The adapter does not reimplement browser launch, CDP, profile reuse, or keep-alive behavior.

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
- Keep the original `main` branch untouched while integration happens on `shamyli/chat-ui-local-base`.
- Production-site write controls will be added only after local/staging QA.
