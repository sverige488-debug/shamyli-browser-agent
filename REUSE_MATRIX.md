# SHAMYLI Browser Agent — Reuse Matrix

## Rule

Do not build a new feature until the same capability has been checked in all three upstream sources below. Prefer direct reuse. If two layers use different runtimes, write only the smallest adapter needed to connect them.

## Source priority

| Capability | Reuse source | SHAMYLI action |
|---|---|---|
| Modern chat layout | `browser-use/chat-ui-example` | Reuse |
| Session page | `browser-use/chat-ui-example` | Reuse |
| Follow-up tasks | `browser-use/chat-ui-example` | Reuse |
| Stop UX | `browser-use/chat-ui-example` + Browser Use core | Reuse |
| Steps / tool activity UI | `browser-use/chat-ui-example` | Reuse |
| Browser panel shell | `browser-use/chat-ui-example` | Reuse |
| Browser screenshot view | `browser-use/web-ui` + Browser Use core `take_screenshot()` | Reuse through thin HTTP adapter |
| Use own browser | `browser-use/web-ui` settings + current `BrowserProfile` | Reuse |
| Keep browser open | `browser-use/web-ui` + current `BrowserProfile.keep_alive` | Reuse |
| Persistent browser user data | `browser-use/web-ui` + current `BrowserProfile.user_data_dir` | Reuse |
| Existing browser / CDP | `browser-use/web-ui` + current `BrowserProfile.cdp_url` | Reuse |
| Browser path | `browser-use/web-ui` + current `BrowserProfile.executable_path` | Reuse |
| Window size | `browser-use/web-ui` + current `BrowserProfile.window_size` | Reuse |
| Headless mode | `browser-use/web-ui` + current `BrowserProfile.headless` | Reuse |
| Pause / Resume | `browser-use/web-ui` + Browser Use core `agent.pause()` / `agent.resume()` | Reuse |
| OpenRouter | Browser Use core `ChatOpenRouter` | Reuse |
| Groq | Browser Use core `ChatGroq` | Reuse |
| OpenAI | Browser Use core `ChatOpenAI` | Reuse |
| Anthropic | Browser Use core `ChatAnthropic` | Reuse |
| Gemini | Browser Use core `ChatGoogle` | Reuse |
| Ollama | Browser Use core `ChatOllama` | Reuse |
| External MCP client | Browser Use 0.13.10 `browser_use.mcp.client.MCPClient` | Reuse; register directly into native `Tools` |
| Browser Use as MCP server | Browser Use 0.13.10 `browser_use.mcp.server` / `browser-use --mcp` | Preserve as separate opt-in interoperability mode; do not recreate |
| MCP transport SDK | Browser Use pinned dependency `mcp==2.1.1` | Reuse transitively; no second MCP stack |
| Legacy custom MCP schema conversion | Old `src/utils/mcp_client.py` / `langchain_mcp_adapters` | Retire; native Browser Use MCP registration replaces it |
| Docker / VNC / noVNC | `browser-use/web-ui` | Preserve full interactive embedded-view option; do not rewrite |
| Recording / traces / downloads | `browser-use/web-ui` + current Browser Use core profile options | Reuse when surfaced in modern UI |

## Custom code allowed

Only glue that cannot be copied directly because the modern UI is TypeScript/React while the local Browser Use runtime is Python:

1. localhost FastAPI endpoints that expose Browser Use core methods without reimplementing them;
2. small React calls that display/configure those endpoints in the existing Chat UI components;
3. mapping old Web UI setting names to current Browser Use core parameter names;
4. a thin MCP safety/config adapter that passes non-secret server settings into native `MCPClient`, resolves explicitly named environment variables locally, suppresses all external MCP tools in Inspect Only, and disconnects clients after each run.

The adapter must not duplicate browser automation, screenshot capture, model providers, MCP protocol/transport/schema registration, pause/resume, session persistence, or browser lifecycle logic already implemented upstream.

## MCP safety rule

External MCP tools are server-defined and may have arbitrary side effects. Therefore:

- Inspect Only starts/registers no external MCP server tools;
- Full Browser Control is required before external MCP tools are available;
- UI/exported settings store environment-variable names only, never values;
- MCP subprocesses receive a least-privilege environment containing process basics plus explicitly allow-listed variable names, not the full backend environment.

## Testing rule

Before asking the user to test a new integration, automate what can be checked in CI first: frontend production build, Python import/syntax, adapter contract tests, MCP safety/registration contract tests, and a real local-browser smoke test without an LLM or API key.
