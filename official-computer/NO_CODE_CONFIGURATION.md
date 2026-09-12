# SHAMYLI no-code configuration on Open WebUI Computer v0.9.21

This is a configuration recipe only. It uses controls already present in the official cptr UI.

## 1. Admin > Tools

Keep the global default built-in approval at:

```text
Review
```

The v0.9.21 Admin > Tools page lets the administrator choose `Allow`, `Review`, or `Default` per built-in tool and choose a review model.

Recommended browser policies:

| Built-in browser tool | Policy |
|---|---|
| `browser_snapshot` | Default (`allow` upstream) |
| `browser_screenshot` | Default (`allow` upstream) |
| `browser_navigate` | Review |
| `browser_click` | Review |
| `browser_type` | Review |
| `browser_evaluate` | Review |

Recommended filesystem/command policy while evaluating SHAMYLI:

| Tool class | Policy |
|---|---|
| Read/search/list tools | Default |
| Create/edit/write file | Review |
| Run/send/kill terminal task | Review |
| Automation create/update/delete | Review |
| Skill mutation | Review |

This uses cptr's own approval engine; there is no SHAMYLI approval code.

## 2. Per chat > Tool permissions

Start with:

```text
Auto-approve
```

The official UI describes this as:

```text
Approve safe actions, ask for risky ones
```

For high-risk production work switch the chat to:

```text
Ask for approval
```

The official UI describes that mode as confirming every tool call before it runs.

Do not use:

```text
Full access
```

for initial production QA. In cptr's own UI, Full access means all tool calls run without confirmation.

## 3. Plan Mode

Turn on Plan Mode before:

- page redesigns;
- template changes;
- form architecture changes;
- global Bricks/Crocoblock changes;
- plugin/config changes;
- any multi-step production mutation.

The upstream Plan Mode prompt explicitly instructs the agent to research with read-only tools before planning and to use `ask_user` when a material decision cannot be discovered.

## 4. Admin > Web > Browser

Enable the agent browser tools.

Recommended initial configuration:

```text
Browser: Enabled
Browser tab default: Chrome
Chrome source: Managed Chrome
Browser provider: Local
Auto launch: Enabled
```

Why Managed Chrome first:

- it gives the evaluation a dedicated profile instead of immediately sharing the user's everyday signed-in browser;
- cptr owns the profile lifecycle and exposes a native clear-profile control;
- once behavior is trusted, Personal Chrome can be evaluated for sites where existing login state is important.

The v0.9.21 Admin > Web source already includes native controls for:

- Proxy vs Chrome browser tabs;
- Managed vs Personal Chrome;
- Personal Chrome keep-alive;
- local / Firecrawl / Browser Use provider choice;
- CDP URL;
- auto-launch;
- session timeout;
- browser stream quality and hardware-acceleration preferences.

No custom browser-settings page is needed before these controls are tested.

## 5. Workspace skill

This branch includes:

```text
.cptr/skills/shamyli-safe-web/SKILL.md
```

That uses cptr's official Agent Skills discovery path and the Agent Skills `SKILL.md` specification. It contains SHAMYLI-specific working rules but no runtime implementation.

Use the skill for SHAMYLI tasks so the product's native agent receives the project's read-first/native-first/strict-scope behavior.

## 6. Native browser before Browser Use

Do not attach Browser Use at first.

The cptr native browser already exposes:

```text
browser_navigate
browser_snapshot
browser_click
browser_type
browser_screenshot
browser_evaluate
```

This is enough to prove or disprove the core requirement: can an existing mature product inspect and operate WordPress/Bricks/Crocoblock safely with visible approvals?

Only if a concrete failure remains should Browser Use be added through cptr's existing `MCP (Stdio)` Tool Server UI.

## 7. Production progression

Use this order:

```text
A. Read/inspect a public page
B. Inspect WordPress admin without editing
C. Inspect Bricks/Crocoblock configuration
D. Make a reversible staging/test edit with approval
E. Refresh and verify frontend state
F. Only after repeated PASS results, consider a narrowly scoped production write
```

At no stage is new infrastructure code required merely to proceed to the next step.

## 8. What should remain OFF during first proof

- Full access mode
- unattended production writes
- public internet exposure of cptr
- sub-agents for production mutation
- background/scheduled write jobs
- Browser Use MCP unless the native browser demonstrates a real gap
- extra custom plugins/scripts created only to compensate for an untested UI feature

## Expected natural endpoint

With the settings above, the zero-custom setup should already provide the desired control loop:

```text
User request
  -> native chat/Plan Mode
  -> inspect with read-safe tools
  -> risky browser/file/command action pauses for approval
  -> user Allow/Deny
  -> native browser executes
  -> screenshot/snapshot verification
  -> final report
```

That is the architecture to test before retaining any SHAMYLI-specific browser-agent runtime.
