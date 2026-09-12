# SHAMYLI Browser Agent — Current Integration Status

Date: 2026-09-12
Branch: `shamyli/chat-ui-local-base`

This file records implementation status only. `REUSE_FIRST_GAP_MAP.md` remains the source of truth for the reuse-first rule.

## Completed in the current reuse-first batch

- Modern Chat UI remains the primary frontend.
- Thin local FastAPI adapter remains the only React/Python bridge.
- Browser Use core remains responsible for `Agent`, `BrowserSession`, `BrowserProfile`, browser actions, screenshots, provider classes, history serialization, GIF generation, built-in planning, and native MCP transport/registration.
- Browser settings from the older Web UI are surfaced in the modern UI and translated to current Browser Use 0.13.10 fields: own browser, persistent profile, keep-alive, headless/security, CDP, window size, recording, trace, downloads, and agent-history path.
- Native Agent settings are surfaced separately: Max Steps, Max Actions Per Step, Use Vision, Generate GIF, built-in Planning controls, Override System Prompt, and Extend System Prompt.
- Legacy LLM controls are ported through current Browser Use provider classes without recreating an LLM layer: provider/model, Temperature, supported Base URL fields, Ollama host, and Ollama Context Length through current `ollama_options`.
- A stale legacy incompatibility was corrected: current `ChatOllama` does not accept the old direct `num_ctx` constructor argument; the integration uses native `ollama_options` instead.
- API keys are intentionally **not** persisted in the browser UI. Provider secrets remain in local environment variables / `.env`; the old password textbox is not copied into localStorage.
- The old Web UI Load/Save Config workflow is restored in the modern UI as JSON import/export for model, LLM, browser, agent, and non-secret MCP settings. Secret values are excluded from exported files.
- Browser/LLM/agent/MCP settings are persisted locally and applied to new sessions/tasks.
- Agent history uses native `Agent.save_history()` and the modern session UI exposes the latest JSON history when available.
- GIF generation uses the native `generate_gif` option and the modern session UI exposes the generated GIF when available.
- Docker mode bind-mounts `./tmp` so downloads, recordings, traces, histories, and GIFs persist on the host.
- Current Browser Use built-in planning is used directly. The removed legacy separate planner-LLM wiring is not recreated.
- Human assistance from the older Web UI is ported through current Browser Use `Tools` + `ActionResult`: the agent can wait for credentials/manual/CAPTCHA/subjective help, the user can act in the live browser and reply, and the same task resumes.
- The modern Browser Panel prefers the existing Web UI Xvfb + x11vnc + noVNC path in Docker mode; native `BrowserSession.take_screenshot()` remains the Windows fallback.
- Docker uses Browser Use's official `browser-use install` instead of a parallel Chromium installer.
- One-command Docker/noVNC Windows launcher: `scripts/start-docker-browser.ps1`; native Windows launcher remains `scripts/start-windows.ps1`.
- Pause / Resume / Stop are wired through native Agent methods.

## Native MCP integration — upstream reused, legacy bridge retired

A second source audit corrected the earlier MCP gap assessment. Browser Use `0.13.10` already ships both sides of MCP support:

- the package pins `mcp==2.1.1`;
- `browser_use.mcp.server` exposes Browser Use itself as an MCP server and the CLI supports `browser-use --mcp`;
- `browser_use.mcp.client.MCPClient` connects to external stdio MCP servers and registers their tools directly into the native Browser Use `Tools` registry.

SHAMYLI therefore does **not** port the old `langchain_mcp_adapters` bridge or its custom schema-conversion layer. The modern UI now has structured MCP configuration for server name, command, arguments, optional action prefix, optional tool allow-list, enabled state, and environment-variable **names**.

MCP secrets follow a least-privilege path:

- the browser UI and exported JSON never contain MCP secret values;
- configured `envKeys` are names only;
- secret values are resolved locally in the Python backend at run time;
- an external MCP subprocess receives only minimal process-discovery variables plus explicitly allow-listed environment-variable names, preventing unrelated backend/provider keys from being inherited automatically;
- MCP clients are connected only for the current task and disconnected when that run finishes.

The native Browser Use MCP server (`browser-use --mcp`) remains available as an interoperability mode, but it is not automatically started inside the SHAMYLI chat runtime because the chat backend already talks to Browser Use directly.

## SHAMYLI safety boundary now added

Upstream reuse has been exhausted for the required legacy capabilities, so the intentionally SHAMYLI-specific layer is kept thin and policy-focused.

- `Inspect Only` is the default interaction mode for new/local settings.
- Inspect mode does **not** replace Browser Use browser actions. It creates the current native `Tools` registry with these interaction actions excluded: `click`, `input`, `upload_file`, `send_keys`, and `select_dropdown`.
- External MCP tools are also completely skipped in Inspect Only. Because MCP tool semantics are defined by arbitrary external servers, SHAMYLI does not guess which ones are read-only.
- The agent can still navigate directly to URLs, read/extract/search pages, scroll, screenshot, and use the existing human-assistance bridge.
- A non-removable Inspect-mode policy is appended to the Agent system message so the model is told not to claim blocked interactions were performed and to ask the user when an interactive step is required.
- `Full Browser Control` explicitly restores Browser Use's normal native interaction toolset and allows explicitly configured MCP servers for sessions where the user intentionally wants those capabilities.
- Imported older settings files that do not contain an interaction mode normalize safely to `Inspect Only`; missing MCP configuration normalizes to an empty list.
- This is an action-level guard for the Browser Use interaction tools above, not a claim that every possible navigational GET request on every website is side-effect-free.

## Automated QA now covers

- Next.js production build.
- FastAPI adapter import / Python syntax.
- Browser/LLM/Agent settings contract mapping.
- Native provider mapping checks, including OpenRouter/OpenAI temperature/base URL and Ollama host/context/temperature.
- Explicit API-contract assertions for the pinned Browser Use Agent fields used by this integration.
- Human-assistance registration/wait/resume contract through current Browser Use `Tools`.
- Inspect-mode contract: all five blocked native interaction actions must be absent, `ask_for_assistant` must remain available, and Full Browser Control must restore the native actions.
- `RunRequest` defaults to `interactionMode=inspect` even if a caller omits the UI setting.
- MCP contract smoke verifies the native `browser_use.mcp.client.MCPClient` path, settings normalization, Inspect-mode MCP suppression, Full-Control registration/filter/prefix behavior, cleanup, environment-variable-name validation, and that unrelated provider/backend secrets are not forwarded to MCP subprocesses.
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
- Legacy custom MCP (`langchain_mcp_adapters`) is not ported because current Browser Use already provides native `MCPClient` registration and an MCP server/CLI mode.

## CI / merge state

- CI uses Node 24 and branch-level concurrency so superseded push/PR jobs are cancelled instead of building an unbounded queue.
- The newest full integration batch still needs a completed CI result before this Draft PR is treated as merge-ready.
- Any CI failure should be fixed before the Draft PR is promoted.

## Safety state

- Integration work remains isolated to `shamyli/chat-ui-local-base`; no integration feature is merged to `main`.
- Pull request remains Draft.
- No production WordPress write testing is part of this integration batch.
- Default mode is Inspect Only; Full Browser Control requires an explicit selection.
