# SHAMYLI Browser Agent

A local, reuse-first Browser Use workspace with a modern Next.js chat UI, a thin FastAPI adapter, native Browser Use automation, and the proven Browser Use Web UI noVNC stack for live browser observation.

This integration intentionally reuses upstream components instead of rebuilding them:

- **Browser Use Chat UI Example** for the modern chat/session UX;
- **Browser Use Web UI** for mature local browser settings and Xvfb/x11vnc/noVNC behavior;
- **Browser Use 0.13.10 core** for `Agent`, `BrowserSession`, `BrowserProfile`, native LLM providers, planning, history, GIFs, browser actions, and MCP support.

Browser Use Cloud is **not required** for local execution.

## Current safety model

`Inspect Only` is the default. It removes Browser Use's `click`, `input`, `upload_file`, `send_keys`, and `select_dropdown` actions from the run and also disables all external MCP tools. Reading, navigation, extraction/search, scrolling, screenshots, and human assistance remain available.

`Full Browser Control` is opt-in. It restores normal Browser Use interaction actions and allows explicitly configured external MCP servers.

This is an action-level safety boundary, not a promise that every navigation request on every website is inherently side-effect-free.

## Windows quick start

Requirements:

- Python 3.11+
- Node.js (CI currently validates Node 24)
- npm
- optional Docker Desktop for the noVNC mode

Clone this repository and switch to the integration branch:

```powershell
git clone https://github.com/sverige488-debug/shamyli-browser-agent.git
cd shamyli-browser-agent
git checkout shamyli/chat-ui-local-base
```

Create your local environment file and add only the provider keys you actually use:

```powershell
Copy-Item .env.example .env
```

Run the one-time setup. It creates the Python venv, installs `browser-use==0.13.10`, uses Browser Use's own browser installer, and installs frontend dependencies:

```powershell
.\scripts\setup-windows.ps1
```

### Option A — native Windows browser

```powershell
.\scripts\start-windows.ps1
```

The launcher opens:

- UI: `http://127.0.0.1:3000`
- local API: `http://127.0.0.1:8000`

The browser panel uses Browser Use screenshot fallback in this mode.

### Option B — Docker + live noVNC browser

With Docker Desktop running:

```powershell
.\scripts\start-docker-browser.ps1
```

The launcher opens the same modern UI and starts the reused noVNC stack:

- UI: `http://127.0.0.1:3000`
- local API: `http://127.0.0.1:8000`
- noVNC: `http://127.0.0.1:6080`

The default local VNC password is `shamyli-local` unless `VNC_PASSWORD` is set in `.env`.

Stop the Docker backend with:

```powershell
docker compose -f docker-compose.local-agent.yml down
```

## LLM providers

The modern UI uses Browser Use's native provider classes. Current presets cover:

- OpenRouter
- Groq
- OpenAI
- Anthropic
- Google / Gemini
- Ollama

The model menu also accepts custom `provider::model-name` values for supported providers.

Provider API keys stay in `.env` / process environment. They are not stored in browser localStorage or exported settings JSON.

## Browser and Agent settings

The modern settings bar exposes the currently mapped Browser Use controls without recreating their implementation:

- own browser / browser binary / user-data directory;
- keep browser open;
- headless and security settings;
- CDP URL;
- browser dimensions;
- recording, trace, download, and history paths;
- max steps / actions per step;
- vision and GIF generation;
- built-in Browser Use planning;
- system-prompt override / extension;
- Inspect Only / Full Browser Control.

Settings can be saved/loaded as JSON. Secret values are excluded.

## Native MCP support

Browser Use 0.13.10 already ships native MCP support. SHAMYLI therefore uses `browser_use.mcp.client.MCPClient` directly and does **not** port the fork's older `langchain_mcp_adapters` bridge.

The MCP menu lets you configure an external stdio server with:

- name;
- command;
- one argument per line;
- enabled state;
- optional action prefix;
- optional tool allow-list;
- environment-variable **names**.

Do not enter secret values in the UI. Put secret values in the local environment and enter only their variable names in MCP settings. The backend constructs a least-privilege subprocess environment and does not automatically forward unrelated provider/backend secrets.

External MCP servers are never started in `Inspect Only`. They are available only in `Full Browser Control`, are connected for the current run, and are disconnected during cleanup.

Browser Use can also expose itself as an MCP server through its native `browser-use --mcp` mode. That interoperability mode is separate from the normal SHAMYLI chat runtime.

### Docker note for MCP secrets

Native Windows mode loads the repository `.env` file directly. Docker receives only variables explicitly mapped into `docker-compose.local-agent.yml`. If an external MCP server running inside Docker needs an additional secret, add that environment variable to the Docker service mapping and reference only its **name** in the MCP UI.

## Human assistance

When the agent reaches a blocker it cannot safely solve — for example credentials, a manual browser action, CAPTCHA, subjective judgment, or a capability blocked by Inspect Only — it can request help and wait. You can act in the live browser if needed, submit your response, and the same task resumes.

## Artifacts

Browser Use native features are reused for:

- agent history JSON;
- generated GIFs;
- recordings;
- traces;
- downloads.

Docker mode persists `./tmp` on the host.

## Architecture

```text
Next.js UI :3000
      |
      v
thin FastAPI adapter :8000
      |
      v
Browser Use 0.13.10
   |        |        |
 browser   LLMs   native MCPClient
   |
 optional Xvfb + x11vnc + noVNC :6080
```

See `LOCAL_ARCHITECTURE.md`, `REUSE_FIRST_GAP_MAP.md`, `REUSE_MATRIX.md`, and `CURRENT_INTEGRATION_STATUS.md` for the implementation/audit details.

## QA and merge policy

The Draft integration PR is expected to pass:

- Next.js production build;
- backend syntax/import and adapter contracts;
- provider/browser/Agent mapping checks;
- Inspect-mode action exclusion;
- human-assistance wait/resume behavior;
- native MCP registration/safety/secret-isolation contracts;
- Docker + Xvfb/x11vnc/noVNC startup smoke;
- real Browser Use Chromium smoke tests on Ubuntu and Windows.

Integration features stay on `shamyli/chat-ui-local-base` until the newest full CI matrix is green. Production WordPress write testing is not part of this integration batch.

## Upstream attribution

This project builds on Browser Use and its Web UI / Chat UI examples. Their upstream licenses and attribution files remain in the repository where applicable.
