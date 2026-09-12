# SHAMYLI Browser Agent — Current Integration Status

Date: 2026-09-12
Branch: `shamyli/chat-ui-local-base`

This file records implementation status only. `REUSE_FIRST_GAP_MAP.md` remains the source of truth for the reuse-first rule.

## Completed in the current reuse-first batch

- Modern Chat UI remains the primary frontend.
- Thin local FastAPI adapter remains the only React/Python bridge.
- Browser Use core remains responsible for `Agent`, `BrowserSession`, `BrowserProfile`, browser actions, screenshots, and provider classes.
- Browser settings from the older Web UI are now surfaced in the modern UI and translated to current Browser Use 0.13.10 fields:
  - Browser Binary Path
  - Browser User Data Dir
  - Use Own Browser
  - Keep Browser Open
  - Headless Mode
  - Disable Security
  - CDP URL
  - Window width / height
- Browser settings are persisted locally and applied when a new session is created.
- `KEEP_BROWSER_OPEN` maps to current `BrowserProfile.keep_alive`.
- Own-browser binary/profile settings map to current `executable_path` / `user_data_dir`.
- CDP maps to current `BrowserProfile.cdp_url`.
- The modern Browser Panel now prefers the existing Web UI Xvfb + x11vnc + noVNC live-browser path in Docker mode.
- Native `BrowserSession.take_screenshot()` remains the fallback for native Windows mode.
- Docker local-agent wiring has its own compose/supervisor files so the legacy Gradio frontend is not reintroduced.
- Docker browser installation uses Browser Use's official `browser-use install` command rather than a separate SHAMYLI Chromium installer.
- One-command Docker/noVNC launcher exists for Windows: `scripts/start-docker-browser.ps1`.
- Existing native Windows launcher remains available: `scripts/start-windows.ps1`.
- Pause / Resume / Stop are already wired through native Agent methods.

## Automated QA now covers

- Next.js production build.
- FastAPI adapter import / Python syntax.
- Browser-settings adapter contract mapping into current BrowserProfile fields.
- Docker Compose configuration validation.
- Real Browser Use Chromium smoke test on Ubuntu.
- Real Browser Use Chromium smoke test on Windows.

## Verified upstream-version differences — do not blindly port old fields

The legacy Web UI in this fork is based on an older Browser Use generation. Current local runtime is pinned to `browser-use==0.13.10`, so old UI fields must be mapped only when a current native equivalent exists.

- `WSS URL`: no `wss_url` field was found in the current 0.13.10 `BrowserProfile`; do not invent a replacement.
- Recording path: current native equivalent is `record_video_dir` (`save_recording_path` alias).
- Trace path: current native equivalent is `traces_dir` (`trace_path` alias).
- Download path: current native equivalent is `downloads_path` (`save_downloads_path` alias).
- `max_actions_per_step` and `use_vision` still exist on the current Agent and can be ported through a thin settings adapter.
- Legacy `max_input_tokens` and `tool_calling_method` were not found on the current 0.13.10 Agent constructor; do not copy the old implementation unchanged.

## Next reuse-first work

1. Finish only browser/agent settings that have a verified native 0.13.10 equivalent (recording, trace, downloads, use vision, max actions per step).
2. Verify whether current Browser Use has a native user-assistance/human-in-the-loop flow before adapting the older Web UI callback.
3. Do not write a new assistance protocol if current Browser Use already provides one.
4. After upstream reuse is exhausted and CI is green, add SHAMYLI-specific safety modes and approval gates.

## Safety state

- `main` remains untouched.
- Pull request remains Draft.
- No production WordPress write testing is part of this integration batch.
