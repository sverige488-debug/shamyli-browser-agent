# Official-first decision matrix

Date: 2026-09-12

The comparison below intentionally favors mature upstream functionality over SHAMYLI-written infrastructure.

| Requirement | Legacy Browser Use Web UI only | Open WebUI + MCPO + Browser Use | Open WebUI Computer (cptr) only | cptr + Browser Use MCP | Current custom SHAMYLI integration |
|---|---|---|---|---|---|
| Zero SHAMYLI runtime code | YES | YES | YES | YES | NO |
| Current modern workstation/chat UI | Legacy Gradio | YES | **YES** | **YES** | YES |
| Browser shown in same product UI | noVNC legacy | Depends on separate integration | **YES, native Browser tabs** | **YES** | YES, custom/reused panel |
| Native browser automation | YES, old Browser Use generation | Browser Use 0.13.10 | **YES** | cptr + Browser Use | Browser Use 0.13.10 |
| Click/type/navigation/screenshot | YES | YES | **YES** | **YES** | YES |
| Managed browser profile | YES/persistent browser | Browser Use | **YES** | **YES** | YES |
| Personal browser support | YES | Browser Use own profile/CDP | **YES** | **YES** | YES |
| Per-action approval UI | Human assistance, not a modern general approval layer | Open WebUI tool permission options | **YES: Ask / Auto / Full** | **YES** | project-specific policy |
| Auto mode separates safe/risky built-ins | No general current classifier | Depends on Open WebUI connection policy | **YES, native registry** | **YES for cptr tools** | custom Inspect/Full |
| Plan-before-write UX | Old planner settings | Open WebUI/model dependent | **YES, native Plan Mode** | **YES** | current Browser Use planning + custom modes |
| Structured ask-user / human decision | YES, legacy assistance | Open WebUI Ask User | **YES, native `ask_user`** | **YES** | custom assistance bridge |
| Files/editor/terminal/Git in same UI | NO | Mostly external | **YES** | **YES** | NO |
| Workspaces | Limited/legacy | YES | **YES** | **YES** | local session model only |
| Skills / project instructions | Legacy prompt fields | Open WebUI tools/prompts | **YES** | **YES** | prompt fields + future project policy |
| Direct local stdio MCP configuration UI | Legacy JSON custom bridge | NO; MCPO translates it | **YES** | **YES** | custom UI around native Browser Use MCPClient |
| Browser Use 0.13.10 native MCP | NO (Web UI pins old core) | **YES** | Not needed for Stage 0 | **YES, direct stdio** | YES |
| Extra MCP/OpenAPI bridge required | NO | **MCPO required for stdio** | NO | NO | NO |
| Current release build evidence | Latest upstream Docker workflow failed | Browser Use + MCPO are maintained; our composed smoke is queued | **v0.9.21 Docker GHCR workflow PASS** | cptr PASS; cross-version MCP still needs smoke | Our fork CI queued |
| Maintenance burden for us | Low but old stack | Low/medium | **Lowest** | Low | Highest |
| Best fit for “stop coding infrastructure” | Medium | Good | **Best current candidate** | Good fallback | Weakest on this criterion |

## Natural stopping point with zero custom runtime code

### Stage 0 — cptr only

This already gives a realistic website-work agent:

```text
Modern workstation UI
+ AI chat
+ live browser tabs
+ managed/personal Chrome
+ navigate/snapshot/click/type/screenshot/evaluate
+ safe/risky approval split
+ Ask / Auto / Full modes
+ Plan Mode
+ ask_user
+ files/editor/terminal/Git
+ workspaces
+ skills/system prompts
+ external tool servers
```

For the original SHAMYLI use case, this is far enough that writing another frontend, another browser panel, another approval controller, another workspace UI, or another MCP manager is not justified before real capability gaps are identified.

### Stage 1 — add Browser Use only if cptr's native browser misses something material

Connect Browser Use 0.13.10 directly through cptr's native MCP (Stdio) Tool Server UI.

This adds Browser Use's richer browser/session MCP toolset without creating MCPO or a SHAMYLI adapter layer.

### Stage 2 — Open WebUI + MCPO only when Open WebUI itself must be the front door

This remains a valid all-official architecture, but it adds a proxy layer that cptr does not need for local stdio MCP.

### Stage 3 — custom code only for a surviving requirement

Examples that might still justify a small custom addition later:

- a very specific SHAMYLI WordPress/Bricks approval rule that cannot be expressed as a skill/instruction plus cptr approval policy;
- a project-specific data integration unavailable as an existing MCP/OpenAPI server;
- a site-specific deterministic operation that is materially more reliable through a dedicated WordPress API integration than browser automation.

A missing visual preference or duplicated setting is **not** enough reason to create a new runtime layer.

## Safety recommendation for the first official-only evaluation

Use:

```text
cptr native browser
Tool permissions: Auto-approve
Plan Mode: ON for design/change planning
Browser profile: Managed Chrome first
Target: staging/local first
```

Escalate to `Ask for approval` when working on production or when every browser/tool action should require confirmation.

Do not use Full access on production until the exact workflow has already been proven elsewhere.

## Important interpretation

“Auto-approve” is not a marketing label we are inventing. In the v0.9.21 source, read-oriented built-ins are explicitly marked `approval: allow`, while unclassified tools default to `review`. The browser registry specifically marks snapshot and screenshot as `allow`; navigate/click/type/evaluate are not given that allow override and therefore inherit review.

This is the same general safe-read / review-write behavior SHAMYLI was starting to custom-build, but it already exists upstream in a product that also supplies the UI around it.
