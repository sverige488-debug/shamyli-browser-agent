# SHAMYLI Browser Agent — Upstream-only baseline

Date: 2026-09-12

## Purpose

This is the zero-custom-code checkpoint for the project.

Before SHAMYLI adds or keeps any custom runtime behavior, the same capability must first be checked in official upstream sources. The preferred order is:

1. `browser-use/browser-use` current pinned runtime and examples;
2. `browser-use/web-ui` for proven local/self-hosted UI and browser-control patterns;
3. `browser-use/chat-ui-example` for the modern chat/session presentation layer.

A feature is not considered safe to reimplement merely because it is missing from our current UI. If upstream already provides it, SHAMYLI should reuse the upstream implementation and write only the smallest adapter needed to connect incompatible stacks.

## Zero-custom branch

`shamyli/upstream-only-webui` was created directly from this repository's `main` branch with **no file changes**.

The source commit is:

`61962296c38a0d064e0ba02c827192b7a81d1819`

That commit is also the current `browser-use/web-ui` upstream `main` commit verified during this audit. Therefore this branch is the exact official Web UI baseline, not a SHAMYLI rewrite.

## What the official Web UI already gives us with zero SHAMYLI runtime code

The current upstream Web UI includes ready-made UI/behavior for:

- Gradio browser-agent UI;
- browser binary path;
- browser user-data directory;
- use-own-browser;
- keep-browser-open between tasks;
- headless mode;
- disable-security option;
- browser window size;
- CDP and legacy WSS controls;
- recording, trace, agent-history, and download paths;
- LLM provider/model, temperature, base URL, API-key input, Ollama context size;
- optional planner LLM controls;
- max steps / actions;
- legacy max-input-tokens and tool-calling controls;
- MCP JSON configuration;
- pause / resume / stop;
- ask-for-human-assistance flow;
- per-step screenshots and task summary;
- Docker Xvfb + VNC/noVNC browser observation stack;
- persistent browser-manager lifecycle.

This means these concepts do not need to be invented by SHAMYLI.

## Where the zero-custom Web UI baseline stops

The official Web UI currently pins:

`browser-use==0.1.48`

SHAMYLI's modern integration is intentionally pinned to the much newer:

`browser-use==0.13.10`

Those generations do not have identical APIs. Current Browser Use 0.13.10 already provides native replacements for many old Web UI concepts, but some old fields no longer exist or have changed. Therefore copying legacy Web UI runtime code unchanged into a 0.13.10 integration would be less safe than using the current core APIs directly.

Examples already verified against 0.13.10:

- current `BrowserProfile` provides own-browser/profile, CDP, keep-alive, headless/security, window size, recording, traces, downloads, allowed/prohibited domains, IP blocking, proxy, extensions, and other browser controls;
- current `Agent` provides native max actions/step, vision, GIF generation, planning, system-message extension/override, pause/resume/stop, and history serialization;
- current core provides `Tools` / `ActionResult` and action exclusion;
- current core provides native MCP client/server support with the pinned MCP SDK;
- current core provides native `sensitive_data` support so secret values can be substituted without exposing their real values to the model;
- current core has no verified direct equivalent for several legacy fields such as the old Web UI WSS field, separate planner-LLM wiring, legacy max-input-tokens constructor option, and legacy tool-calling-method constructor option.

## Verification caveat: official does not automatically mean green

The upstream Web UI is the official source, but its latest `main` Docker Build workflow for commit `61962296...` completed with failure on both amd64 and arm64. The old job logs are no longer downloadable from GitHub due retention, so the exact historical build failure cannot be responsibly guessed.

For that reason, SHAMYLI uses a stricter rule:

**official source + version match + current verification**

A component should be treated as production-ready for this project only after all three are true.

## Practical conclusion

The upstream-only experiment gets us naturally to a feature-rich **legacy Gradio local agent** with browser settings, persistence, noVNC, agent controls, MCP configuration, planner controls, and human assistance without SHAMYLI runtime code.

It does **not** naturally give us the requested combination of:

- the modern Chat UI;
- current Browser Use 0.13.10 APIs;
- current native MCP implementation;
- SHAMYLI-specific safe interaction policy;
- a verified current build on our target Windows/Docker paths.

That boundary is the exact point where a thin integration adapter is justified. The adapter must remain translation/glue only; browser automation, model providers, MCP transport/schema handling, browser lifecycle, screenshots, history, planning, and other upstream capabilities stay upstream-owned.

## Project law going forward

Before writing runtime code for any new capability:

1. inspect the official current-version source/docs/examples;
2. inspect the official Web UI and Chat UI for an existing proven UX/behavior;
3. prefer direct configuration or composition of upstream objects;
4. if an adapter is unavoidable, keep it as small and reversible as possible;
5. add automated contract/smoke coverage before asking the user to test;
6. never call a component "proven" or "guaranteed" only because it is official — verify the exact pinned version and current test/build result.
