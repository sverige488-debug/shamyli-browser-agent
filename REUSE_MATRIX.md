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
| Docker / VNC / noVNC | `browser-use/web-ui` | Preserve for later full interactive embedded-view option; do not rewrite |
| Recording / traces / downloads | `browser-use/web-ui` + current Browser Use core profile options | Reuse when surfaced in modern UI |

## Custom code allowed

Only glue that cannot be copied directly because the modern UI is TypeScript/React while the local Browser Use runtime is Python:

1. localhost FastAPI endpoints that expose Browser Use core methods without reimplementing them;
2. small React calls that display those endpoints in the existing Chat UI components;
3. mapping old Web UI setting names to current Browser Use core parameter names.

The adapter must not duplicate browser automation, screenshot capture, model providers, pause/resume, session persistence, or browser lifecycle logic already implemented upstream.

## Testing rule

Before asking the user to test a new integration, automate what can be checked in CI first: frontend production build, Python import/syntax, and a real local-browser smoke test without an LLM or API key.
