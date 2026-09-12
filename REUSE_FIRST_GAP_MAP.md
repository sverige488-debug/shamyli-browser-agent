# SHAMYLI Browser Agent — Reuse-First Integration Map

## Non-negotiable rule

Do **not** invent a new feature implementation when Browser Use already ships a tested implementation in one of these sources:

1. `browser-use/chat-ui-example` — modern Next.js/React/Tailwind UX.
2. `browser-use/web-ui` — mature local/self-hosted browser + agent controls.
3. `browser-use/browser-use` — official core runtime, browser/session logic and native LLM providers.

New SHAMYLI code is allowed only for the **smallest adapter/glue layer** required to connect incompatible stacks (React/TypeScript frontend ↔ Python Browser Use runtime) or for SHAMYLI-specific safety policy that does not exist upstream.

---

## Source of truth by feature

| Feature | Reuse from | Existing upstream implementation | SHAMYLI action |
|---|---|---|---|
| Modern chat shell | `chat-ui-example` | Next.js/React/Tailwind session UI | Reuse |
| Session page | `chat-ui-example` | Modern session layout | Reuse |
| Browser panel UX | `chat-ui-example` | Right-side browser panel / `liveUrl` concept | Reuse UI |
| Follow-up task UX | `chat-ui-example` | Same-session follow-up flow | Reuse |
| Stop task UX | `chat-ui-example` | Stop control | Reuse |
| Model/profile/workspace UX | `chat-ui-example` | Existing selectors/settings patterns | Reuse UI; replace Cloud calls only |
| Local Browser Use execution | `browser-use` core | `Agent`, `BrowserSession` | Reuse directly |
| Native LLM providers | `browser-use` core | OpenRouter, Groq, OpenAI, Anthropic, Google, Ollama, etc. | Reuse directly; no provider reimplementation |
| Browser binary path | `web-ui` | `browser_settings_tab.py` | Port setting |
| Browser user-data dir | `web-ui` | `browser_settings_tab.py` | Port setting |
| Use Own Browser | `web-ui` | `USE_OWN_BROWSER` | Port behavior |
| Keep Browser Open | `web-ui` | `KEEP_BROWSER_OPEN` | Port behavior |
| Headless setting | `web-ui` | Browser settings | Port behavior |
| CDP URL | `web-ui` | `BROWSER_CDP` | Port behavior |
| WSS URL | `web-ui` | Browser settings | Port behavior |
| Window width/height | `web-ui` | Browser settings | Port behavior |
| Recording path | `web-ui` | Browser settings | Port behavior |
| Trace path | `web-ui` | Browser settings | Port behavior |
| Agent history path | `web-ui` | Browser settings | Port behavior |
| Download path | `web-ui` | Browser settings | Port behavior |
| Agent max steps/actions/tokens | `web-ui` | `browser_use_agent_tab.py` settings flow | Port behavior |
| Use Vision | `web-ui` / core | Existing agent setting | Port behavior |
| Tool calling method | `web-ui` | Existing setting | Port behavior |
| MCP server config | `web-ui` | Existing setting | Port behavior |
| Planner LLM | `web-ui` | Existing planner settings | Port behavior later |
| Pause / Resume | `web-ui` | Existing agent control | Reuse behavior later |
| Ask-for-assistance | `web-ui` | Existing callback / user-response flow | Reuse behavior later |
| Per-step screenshots | `web-ui` | Existing screenshot handling in agent callback | Reuse if needed; do not invent screenshot protocol |
| Live browser via noVNC | `web-ui` Docker stack | VNC/noVNC already wired in Dockerfile / supervisord / compose | Prefer reuse over custom live-stream code |
| Browser state/screenshots | `browser-use` core | Existing BrowserSession APIs | Reuse only when noVNC is not suitable |

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
  - CDP URL
  - WSS URL
  - Recording / trace / history / download paths

- `src/webui/components/browser_use_agent_tab.py`
  - Native LLM initialization through the project's provider helper
  - Browser settings retrieval
  - Agent lifecycle
  - Per-step screenshot handling
  - Stop / Pause / Resume controls
  - User-assistance callback
  - max steps/actions/input tokens
  - MCP config
  - optional planner LLM

- `Dockerfile`, `supervisord.conf`, `docker-compose.yml`
  - x11vnc / TigerVNC / noVNC stack
  - browser observation path already implemented upstream

### `browser-use/chat-ui-example`

- `src/lib/api.ts`
  - confirms the modern UI is intentionally thin and currently points to Browser Use Cloud SDK
  - our replacement target is this API boundary, not the whole UI

### `browser-use/browser-use`

- Official `Agent` and `BrowserSession`
- Native provider classes
- Browser/session/CDP implementation

---

## What we keep custom

Only a small local API adapter is justified because the two official UIs use different stacks:

```text
Next.js Chat UI
      ↓
small localhost adapter
      ↓
Browser Use Python runtime
```

The adapter may translate:

- create session
- run/follow-up task
- stream step events
- stop/pause/resume
- browser settings from UI to existing Browser Use objects
- model/provider selection to existing Browser Use provider classes
- live-view URL when using the reused noVNC stack

It must **not** duplicate Browser Use browser logic, provider logic, screenshot logic, profile logic, or automation actions.

---

## Next implementation order

1. Keep the existing modern Chat UI intact.
2. Replace custom browser configuration with the settings/behavior already proven in `web-ui`.
3. Reuse `web-ui` noVNC stack for live browser view before considering any custom streaming implementation.
4. Reuse `web-ui` persistent browser / CDP / own-browser behavior.
5. Reuse upstream pause/resume and ask-for-assistance behavior.
6. Only then add SHAMYLI-specific safety controls (Read Only / Safe Edit / approval gates), because those are project-specific requirements.

## Test policy

- Prefer upstream-tested behavior unchanged.
- Every adapter change must be small and isolated.
- `main` remains untouched until the integration branch is stable.
- No production WordPress writes during integration testing.
