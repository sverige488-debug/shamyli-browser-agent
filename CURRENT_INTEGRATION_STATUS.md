# SHAMYLI Browser Agent — Current Integration Status

Date: 2026-09-12
Branch: `shamyli/chat-ui-local-base`

This file records implementation status only. `REUSE_FIRST_GAP_MAP.md` remains the source of truth for the reuse-first rule.

## Completed in the current reuse-first batch

- Modern Chat UI remains the primary frontend.
- Thin local FastAPI adapter remains the only React/Python bridge.
- Browser Use core remains responsible for `Agent`, `BrowserSession`, `BrowserProfile`, browser actions, screenshots, provider classes, history serialization, GIF generation, and built-in planning.
- Browser settings from the older Web UI are surfaced in the modern UI and translated to current Browser Use 0.13.10 fields: own browser, persistent profile, keep-alive, headless/security, CDP, window size, recording, trace, downloads, and agent-history path.
- Native Agent settings are surfaced separately: Max Steps, Max Actions Per Step, Use Vision, Generate GIF, built-in Planning controls, Override System Prompt, and Extend System Prompt.
- Legacy LLM controls are now ported through current Browser Use provider classes without recreating an LLM layer:
  - provider/model selection plus custom `provider::model` values;
  - Temperature;
  - Base URL for OpenRouter/Groq/OpenAI/Anthropic and host mapping for Ollama;
  - Ollama Context Length via current `ollama_options.num_ctx`;
  - Google continues on its current native client because 0.13.10 does not expose the old generic `base_url` field there.
- A stale legacy incompatibility was corrected: current `ChatOllama` does not accept the old direct `num_ctx` constructor argument; the integration now uses native `ollama_options` instead.
- API keys are intentionally **not** persisted in the browser UI. Provider secrets remain in local environment variables / `.env`; the old password textbox is not copied into localStorage.
- The old Web UI Load/Save Config workflow is restored in the modern UI as JSON import/export for model, LLM, browser, and agent settings. Secret API keys are excluded from the exported file.
- Browser/LLM/agent settings are persisted locally and applied to new sessions/tasks.
- Agent history uses native `Agent.save_history()` and the modern session UI exposes the latest JSON history when available.
- GIF generation uses the native `generate_gif` option and the modern session UI exposes the generated GIF when available.
- Docker mode bind-mounts `./tmp` so downloads, recordings, traces, histories, and GIFs persist on the host.
- Current Browser Use built-in planning is used directly. The removed legacy separate planner-LLM wiring is not recreated.
- Human assistance from the older Web UI is ported through current Browser Use `Tools` + `ActionResult`: the agent can wait for credentials/manual/CAPTCHA/subjective help, the user can act in the live browser and reply, and the same task resumes.
- The modern Browser Panel prefers the existing Web UI Xvfb + x11vnc + noVNC path in Docker mode; native `BrowserSession.take_screenshot()` remains the Windows fallback.
- Docker uses Browser Use's official `browser-use install` instead of a parallel Chromium installer.
- One-command Docker/noVNC Windows launcher: `scripts/start-docker-browser.ps1`; native Windows launcher remains `scripts/start-windows.ps1`.
- Pause / Resume / Stop are wired through native Agent methods.

## Automated QA now covers

- Next.js production build.
- FastAPI adapter import / Python syntax.
- Browser/LLM/Agent settings contract mapping.
- Native provider mapping checks, including OpenRouter/OpenAI temperature/base URL and Ollama host/context/temperature.
- Explicit API-contract assertions for the pinned Browser Use Agent fields used by this integration.
- Human-assistance registration/wait/resume contract through current Browser Use `Tools`.
- Docker Compose validation and real adapter + Xvfb/x11vnc/noVNC startup smoke.
- API health plus noVNC page availability.
- Real Browser Use Chromium smoke tests on Ubuntu and Windows.

## Verified upstream-version differences — do not blindly port old fields

The legacy Web UI targets an older Browser Use generation. Current local runtime is pinned to `browser-use==0.13.10`, so old UI fields are mapped only when a current native equivalent exists.

- `WSS URL`: no current `wss_url` field found; no replacement invented.
- Recording/trace/download paths: mapped to current native fields.
- Agent history: current `Agent.save_history()` is used directly.
- GIF, vision, actions/step, planning, and system-prompt controls are current native Agent fields and are mapped.
- Legacy separate `planner_llm` / `use_vision_for_planner` are absent; current built-in planning is used instead.
- Legacy `max_input_tokens` and `tool_calling_method` were not found on the current Agent constructor and are not copied.
- Old generic Google `base_url` does not map to a current `ChatGoogle` field and is intentionally ignored for Google.
- No native MCP package/API was found in the pinned 0.13.10 Browser Use tree during this audit. The old custom MCP client remains excluded until a supported native path is verified.

## Next reuse-first work

1. Let the queued CI batch validate the provider-tuning/config-backup additions plus the existing browser/agent/human-assistance integration.
2. Fix any CI failure before adding SHAMYLI-specific behavior.
3. Keep unsupported legacy options out instead of maintaining parallel replacements.
4. After upstream reuse is exhausted and CI is green, add SHAMYLI-specific safety modes and approval gates.

## Safety state

- `main` remains untouched.
- Pull request remains Draft.
- No production WordPress write testing is part of this integration batch.
