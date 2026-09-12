---
name: shamyli-safe-web
description: Safely inspect, plan, edit, and QA SHAMYLI WordPress/Bricks/Crocoblock work with native UI features first, minimal changes, explicit approvals for risky actions, and no unnecessary custom code.
---

# SHAMYLI Safe Web Work

Use this skill for SHAMYLI website administration, WordPress, Bricks Builder, Crocoblock, JetEngine, JetFormBuilder, JetSmartFilters, and related browser-based QA.

## Core rule

Prefer existing native, official, visible product controls over custom code.

Before creating CSS, JavaScript, PHP, HTML, a custom plugin, or another integration layer:

1. inspect the current UI and installed product capabilities;
2. check whether the required behavior is already available natively;
3. use the native configuration when it can satisfy the requirement cleanly;
4. write custom code only when a concrete required capability is genuinely missing.

Do not replace a working native configuration with custom code merely because code would be faster to generate.

## Work sequence

For changes to an existing site:

1. **Inspect first.** Identify the exact page, template, form, query, field, component, plugin setting, and current state before changing anything.
2. **Research before guessing.** When behavior depends on Bricks/Crocoblock/WordPress product APIs or current-version behavior, consult the official documentation/source available to you before choosing a solution.
3. **Plan the smallest change.** Prefer one local setting/change over broad redesigns, global CSS, global JS, PHP snippets, or plugin-level changes.
4. **Keep the requested scope strict.** Do not improve unrelated areas just because you notice them.
5. **Use approvals for writes.** When a browser/tool action may alter production state, preserve the active approval mode and wait for the user when the UI asks for confirmation.
6. **Verify after the change.** Re-open or refresh the relevant frontend/admin state and confirm the actual result rather than assuming a save succeeded.
7. **Report the exact change.** Include relevant page/template/form/post IDs, setting names, and whether the final state was saved/published/pending.

## Production policy

Treat `shamyli.com` as production unless the user explicitly identifies a staging/test target.

On production:

- Do not delete data unless deletion is the explicit task.
- Do not bulk-edit unrelated content.
- Do not change global theme/plugin/site settings to solve a local component issue unless no narrower native solution exists and the user approves it.
- Do not update plugins/themes/core as part of another task.
- Do not change authentication, users, roles, secrets, email delivery, DNS, Cloudflare, payment, or analytics settings unless that exact area is the requested task.
- Do not publish a draft or pending item unless publishing is part of the requested task.
- Do not submit real production forms merely to test them when a safer preview/test path exists.

If a requested action is destructive, broad, difficult to reverse, or outside the stated scope, stop and ask before executing it.

## Bricks Builder

When working in Bricks:

- Reuse existing sections/components/classes when they already represent the approved design system.
- Prefer Bricks controls and conditions over injected code.
- Do not restructure unrelated sections.
- Before saving, confirm you are editing the intended page/template and not a similarly named backup/test item.
- After saving, verify the frontend at desktop and mobile widths when layout is part of the task.
- Avoid global CSS/JS unless the problem is genuinely global and the user approves that scope.

## Crocoblock / JetEngine / JetFormBuilder

When working with Crocoblock:

- Preserve field names, meta keys, post mappings, query ownership filters, and submit actions unless the task explicitly changes them.
- Prefer built-in conditions, Dynamic Tags, Query Builder, listings, form actions, calculated/dynamic fields, and plugin settings before custom code.
- When editing an existing form, verify that edit/update behavior still targets the same post rather than creating a new one.
- For required wizard fields, verify both visual state and actual Next/Submit blocking behavior.
- When a change touches a meta field, confirm the exact meta key before saving.

## Browser QA

Use the native browser tools to verify what a user really sees.

Prefer this sequence:

1. browser snapshot/state for structure;
2. screenshot for visual confirmation;
3. direct interaction only when needed;
4. refresh/re-open after save;
5. final screenshot/state check.

For responsive work, check at least desktop and a mobile-sized view when the available browser UI supports it.

Do not claim PASS from editor state alone when the requirement concerns frontend behavior.

## Authentication and human-only blockers

Do not try to bypass CAPTCHA, 2FA, BankID, security confirmations, or other human-verification mechanisms.

If the user must authenticate or approve a security step, explain exactly what is needed and wait.

Never expose stored secrets in chat output.

## No-code preference

The default solution priority is:

1. native product feature;
2. official plugin/integration already installed and suitable;
3. mature official external tool/MCP integration;
4. minimal configuration glue;
5. custom code only as a last resort.

When custom code is unavoidable, keep it isolated and reversible, explain why the native paths are insufficient, and do not expand the scope beyond the missing capability.

## Completion report

At the end of a meaningful batch, report concisely:

- what was changed;
- exact IDs/names affected when available;
- what was intentionally not changed;
- verification performed;
- PASS/FAIL for the requested behavior;
- any remaining blocker that actually requires the user.

Do not ask the user to repeat manual tests that can be performed with the available browser/tools first.
