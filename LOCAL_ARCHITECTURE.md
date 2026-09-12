# SHAMYLI Browser Agent — Local architecture

This branch combines three existing open-source building blocks instead of rebuilding them:

1. **Browser Use Chat UI Example** — modern Next.js/React/Tailwind chat + live-browser UX.
2. **Browser Use open-source core** — local browser automation and agent runtime.
3. **Provider adapters already shipped by Browser Use** — OpenRouter, Groq, OpenAI, Anthropic, Google, Ollama, etc.

The only custom layer is a small localhost API adapter between the Next.js UI and the Python Browser Use runtime.

## Local-only topology

```text
Browser on this PC
  -> Next.js UI (127.0.0.1:3000)
  -> Local API adapter (127.0.0.1:8000)
  -> Browser Use open source
  -> Local Chromium / Chrome
  -> Selected LLM provider
```

No Browser Use Cloud API is required for local execution.

## Safety baseline

- Bind local services to `127.0.0.1` by default.
- Never commit API keys, WordPress passwords, cookies, or session data.
- Keep the original `main` branch untouched while integration happens here.
- Production-site write controls will be added only after local/staging QA.
