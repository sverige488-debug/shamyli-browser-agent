# SHAMYLI Browser Agent — Current Integration Status

Date: 2026-09-12
Branch: `shamyli/chat-ui-local-base`

This file records implementation status only. `REUSE_FIRST_GAP_MAP.md` remains the source of truth for the reuse-first rule.

## Completed in the current reuse-first batch

- Modern Chat UI remains the primary frontend.
- Thin local FastAPI adapter remains the only React/Python bridge.
- Browser Use core remains responsible for `Agent`, `BrowserSession`, `BrowserProfile`, browser actions, screenshots, provider classes, history serialization, GIF generation, and built-in planning.
- Browser settings from the older Web UI are now surfaced in the modern UI and translated to current Browser Use 0.13.10 fields:
  - Browser Binary Path
  - Browser User Data Dir
  - Use Own Browser
  - Keep Browser Open
  - Headless Mode
  - Disable Security
  - CDP URL
  - Window width / height
  - Recording Path -> native `record_video_dir`
  - Trace Path -> native `traces_dir`
  - Download Path -> native `downloads_path`
  - Agent History Path -> used with native `Agent.save_history()`
- Browser settings are persisted locally and applied when a new session is created.
- Optional path values returned by the backend are normalized before entering React controlled inputs.
- `KEEP_BROWSER_OPEN` maps to current `BrowserProfile.keep_alive`.
- Own-browser binary/profile settings map to current `executable_path` / `user_data_dir`.
- CDP maps to current `BrowserProfile.cdp_url`.
- Native Agent settings are now surfaced separately from Browser settings:
  - Max Steps
  - Max Actions Per Step
  - Use Vision
  - Generate GIF
  - Enable Planning
  - Planning Replan on Stall
  - Planning Exploration Limit
- Agent settings are persisted locally and sent with every task/follow-up; the adapter passes them directly to current `Agent` / `Agent.run()` parameters.
- Every completed run gets a unique artifact directory under the configured Agent History path.
- Agent history is saved with Browser Use's native `Agent.save_history()`; the modern session UI exposes the latest history JSON as a download when available.
- GIF generation uses the current native `generate_gif` Agent option; the modern session UI exposes the latest GIF when enabled and successfully generated.
- Docker mode bind-mounts `./tmp` to the local adapter so downloads, recordings, traces, histories, and GIFs persist on the host instead of disappearing with the container.
- Current Browser Use built-in planning is used directly. The legacy separate planner-LLM wiring is not copied because that constructor API is not present in 0.13.10.
- Human assistance from the older Web UI is ported through the current Browser Use `Tools` registry and `ActionResult` rather than a parallel action engine:
  - the agent can request help for credentials, CAPTCHA/manual actions, subjective decisions, or other hard blockers;
  - the chat UI clearly enters a waiting-for-user state;
  - the user can act in the live browser, reply, and the same running task resumes;
  - Stop safely releases a pending assistance wait.
- The modern Browser Panel prefers the existing Web UI Xvfb + x11vnc + noVNC live-browser path in Docker mode.
- Native `BrowserSession.take_screenshot()` remains the fallback for native Windows mode.
- Docker local-agent wiring has its own compose/supervisor files so the legacy Gradio frontend is not reintroduced.
- Docker browser installation uses Browser Use's official `browser-use install` command rather than a separate SHAMYLI Chromium installer.
- One-command Docker/noVNC launcher exists for Windows: `scripts/start-docker-browser.ps1`.
- Existing native Windows launcher remains available: `scripts/start-windows.ps1`.
- Pause / Resume / Stop are wired through native Agent methods.

## Automated QA now covers

- Next.js production build.
- FastAPI adapter import / Python syntax.
- Browser/agent settings adapter contract mapping into current BrowserProfile and RunRequest fields.
- Explicit API-contract assertions that the pinned Browser Use Agent still exposes `save_history`, `generate_gif`, `enable_planning`, `planning_replan_on_stall`, `planning_exploration_limit`, `use_vision`, and `max_actions_per_step`.
- Human-assistance registration/wait/resume contract through current Browser Use `Tools`.
- Docker Compose configuration validation.
- Real Docker build/start smoke for the local adapter + Xvfb/x11vnc/noVNC stack.
- API health plus noVNC page availability inside the Docker smoke.
- Real Browser Use Chromium smoke test on Ubuntu.
- Real Browser Use Chromium smoke test on Windows.

## Verified upstream-version differences — do not blindly port old fields

The legacy Web UI in this fork is based on an older Browser Use generation. Current local runtime is pinned to `browser-use==0.13.10`, so old UI fields are mapped only when a current native equivalent exists.

- `WSS URL`: no `wss_url` field was found in the current 0.13.10 `BrowserProfile`; do not invent a replacement.
- Recording path: current native equivalent is `record_video_dir` (`save_recording_path` alias) and is mapped.
- Trace path: current native equivalent is `traces_dir` (`trace_path` alias) and is mapped.
- Download path: current native equivalent is `downloads_path` (`save_downloads_path` alias) and is mapped.
- Agent history: current `Agent.save_history()` exists and is now used directly.
- `generate_gif`, `max_actions_per_step`, `use_vision`, and built-in planning controls exist on the current Agent and are mapped.
- Legacy separate `planner_llm` / `use_vision_for_planner` constructor fields were not found on the current 0.13.10 Agent; the modern UI uses current built-in planning instead of recreating the removed planner wiring.
- Legacy `max_input_tokens` and `tool_calling_method` were not found on the current 0.13.10 Agent constructor; do not copy the old implementation unchanged.
- No native MCP package/API was found in the pinned 0.13.10 Browser Use tree during this audit. The old custom MCP client is intentionally not copied into the modern integration until a supported native path is verified.

## Next reuse-first work

1. Let the new CI batch validate history/GIF/planning plus the existing human-assistance bridge on both frontend and backend.
2. Review the remaining legacy settings against current 0.13.10 one by one; port only current native equivalents.
3. Keep MCP out until a supported current Browser Use API is verified rather than maintaining an old parallel protocol.
4. After upstream reuse is exhausted and CI is green, add SHAMYLI-specific safety modes and approval gates.

## Safety state

- `main` remains untouched.
- Pull request remains Draft.
- No production WordPress write testing is part of this integration batch.
