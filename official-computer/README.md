# SHAMYLI official-only experiment — Open WebUI Computer

Date: 2026-09-12
Candidate: `open-webui/computer` v0.9.21

## Rule of this branch

This branch adds **no SHAMYLI runtime implementation**. It is an evaluation checkpoint for seeing how far the project can go using only a maintained official product as shipped.

No custom browser engine. No custom FastAPI adapter. No custom chat frontend. No custom approval engine. No custom MCP bridge. No custom tool schema layer.

## Why Open WebUI Computer is a stronger zero-custom candidate

Open WebUI Computer (`cptr`) already combines the layers that SHAMYLI was assembling separately:

- browser-based workstation UI;
- built-in AI chat and tool calling;
- browser tabs and local browser automation;
- filesystem/editor/terminal/git;
- persistent terminal sessions and workspaces;
- built-in tool approvals;
- Plan Mode;
- built-in human-question flow;
- skills and system prompts;
- external MCP/OpenAPI tool servers;
- direct **local stdio MCP server** support;
- model/provider configuration;
- coding-agent backends such as Codex and Claude Code;
- Windows support;
- Docker images, including a browser-enabled image.

The current official stable release is `v0.9.21`. Its exact release commit has a successful official `Docker (GHCR)` GitHub Actions run, so this candidate has stronger current build evidence than the legacy Browser Use Web UI baseline.

## Stage 0 — use cptr exactly as shipped

The first experiment should use **only cptr's native browser**. Browser Use is not required at this stage.

Official pinned local install:

```powershell
python -m venv .cptr-venv
.\.cptr-venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install "cptr[mcp]==0.9.21"
cptr run
```

Official uv equivalent:

```powershell
uvx --from "cptr[mcp]==0.9.21" cptr run
```

The UI opens locally on port 8000 by default.

### Browser capability already present

The v0.9.21 built-in browser tool registry contains:

- `browser_navigate`
- `browser_snapshot`
- `browser_click`
- `browser_type`
- `browser_screenshot`
- `browser_evaluate`

`browser_snapshot` and `browser_screenshot` are explicitly classified as auto-approved/read-safe tools in cptr's own registry. Interactive browser actions such as navigate/click/type/evaluate inherit the built-in review policy instead of being silently treated as safe.

That is already very close to the desired SHAMYLI operating model without a custom safety layer.

## Native approval modes

The official UI exposes three modes:

1. **Ask for approval** — confirm every tool call before it runs.
2. **Auto-approve** — approve safe actions and ask for risky ones.
3. **Full access** — all tool calls run without confirmation.

For SHAMYLI evaluation, the default recommendation is:

```text
Auto-approve
```

For production WordPress / Bricks changes or any uncertain action:

```text
Ask for approval
```

Do not use Full access for production-site evaluation until the behavior is proven on a staging/local target.

The underlying v0.9.21 registry defaults unclassified built-in tools to `review`; read-only tools such as reading files, searching, browser snapshot, and browser screenshot are explicitly `allow`.

## Plan Mode

Plan Mode is already present upstream. Its system instruction tells the agent to research with read-only tools first and use the built-in `ask_user` flow for material decisions that cannot be discovered.

This means the desired workflow:

```text
inspect/research -> propose plan -> user decision -> execute
```

already exists as a product feature. SHAMYLI should not recreate it before testing the upstream behavior.

## Human input

cptr contains the built-in `ask_user` tool and UI handling for structured questions/options. This can replace a custom human-assistance bridge for ordinary clarification/approval workflows.

## Browser UI

Unlike a chat-only frontend plus custom noVNC panel, cptr is itself a workstation UI. Its official product already exposes browser tabs alongside chats, files, terminals and other sessions.

The README explicitly supports:

- Proxy browser;
- private Managed Chrome profile;
- Personal Chrome session;
- navigate/click/fill/screenshots through the AI;
- browser tabs in the same UI.

Therefore no custom embedded browser panel should be written unless this native experience fails a concrete requirement.

## Files, terminal, Git and coding agents

The official UI already provides:

- real workspace files;
- editor;
- terminal;
- Git stage/diff/branch/commit/push;
- persistent sessions;
- built-in AI tool calls;
- Codex / Claude Code / Cursor / Grok / OpenCode / Cline / Gemini / Pi agent profiles.

For a website-building agent, this is relevant because the same interface can inspect source/configuration, run diagnostics, use Git, and operate the browser without a SHAMYLI-specific orchestration backend.

## Skills / project instructions

The native product supports reusable skills and system prompts. SHAMYLI-specific knowledge should first be expressed as configuration/instructions/skills rather than runtime code whenever possible.

Examples of good candidates for skills instead of code:

- SHAMYLI site structure and naming conventions;
- read-only-first workflow;
- Bricks/Crocoblock QA checklist;
- never save Production until explicitly requested;
- screenshot QA sequence;
- staging-before-production policy;
- how to report changed IDs and rollback points.

This keeps project specialization declarative and editable.

## Stage 1 — optional Browser Use, still zero SHAMYLI runtime code

Only if cptr's native browser is materially insufficient, use its **native MCP (Stdio) Tool Server** UI to attach Browser Use directly.

The v0.9.21 Tool Servers UI officially supports:

```text
Type: MCP (Stdio)
Command
Arguments
Working directory
Environment JSON
Enable/Disable
Verify
```

Browser Use 0.13.10 already exposes its own official stdio MCP server with:

```powershell
uvx --from "browser-use[cli]==0.13.10" browser-use --mcp
```

So the optional direct connection is:

```text
cptr
  -> native MCP stdio client
  -> Browser Use 0.13.10 --mcp
```

No MCPO and no SHAMYLI adapter are required for this particular route.

Because cptr v0.9.21 uses the MCP 1.x client SDK while Browser Use 0.13.10 packages MCP 2.1.1, this direct optional path must be runtime-smoke-tested before being called verified. The two processes are dependency-isolated when Browser Use is launched through `uvx`, but protocol interoperability is still something to prove, not assume.

## Why MCPO remains a secondary experiment

The `shamyli/official-openwebui-mcp` branch remains useful for an Open WebUI-first architecture. MCPO is the official Open WebUI recommendation for translating stdio MCP into OpenAPI.

But for a local workstation agent, cptr removes one entire layer because it already speaks local MCP stdio directly and already has browser automation/approvals.

Therefore the reuse-first order is now:

1. **cptr native browser only**
2. **cptr + Browser Use native stdio MCP**, only if needed
3. **Open WebUI + MCPO + Browser Use**, if Open WebUI specifically must remain the front door
4. custom SHAMYLI integration only for requirements that survive all three official options

## Security boundary from the official product

cptr explicitly describes itself as the user's computer served through a browser. Once authenticated, the user has host filesystem/shell-level power comparable to an SSH session.

For SHAMYLI evaluation:

- bind to localhost only;
- use a normal non-admin Windows account;
- do not expose the instance directly to the public internet;
- use a Managed/Personal browser profile dedicated to the work where possible;
- start with Auto-approve or Ask for approval;
- use staging/local targets before production writes;
- keep production credentials only where they are actually required.

Docker can reduce filesystem exposure to mounted folders, but browser/profile behavior differs from a native Windows run, so the two modes should be evaluated separately.

## Licensing note

Open WebUI Computer v0.9.21 is source-available under the project's Open Use License rather than the same permissive license as every dependency. Personal/internal evaluation is one question; commercial redistribution or embedding is another. Any future commercial SHAMYLI product should check the upstream Computer license terms before making cptr itself part of a sold/distributed product.

## Current decision

For the user's stated goal — stop rebuilding infrastructure, use mature native components, keep a visual browser/workspace, support AI work with approvals, and minimize maintenance — **Open WebUI Computer is currently the strongest zero-custom-runtime candidate found in the official source audit.**

The next proof should therefore evaluate cptr's own native browser and approval workflow before adding Browser Use, MCPO, or any SHAMYLI runtime code.
