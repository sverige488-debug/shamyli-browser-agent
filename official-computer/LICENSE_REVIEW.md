# Open WebUI Computer license review for this experiment

Date checked: 2026-09-12
Version evaluated: cptr v0.9.21

This is a practical project note, not legal advice.

## Official software license

The v0.9.21 repository ships the **Open Use License**. Its text incorporates Elastic License 2.0 and adds attribution-preservation conditions.

The distributed license states that Open WebUI attribution elements may not be removed, modified, obscured, replaced, or supplemented in deployments, distributions, or derivative works.

It also says commercial, organizational, or production use is subject to the applicable commercial terms published by Open WebUI.

## Official commercial terms checked

The current Open WebUI Terms, effective 2026-07-07, contain product-specific **Open WebUI Computer Commercial Terms** stating that:

- Open WebUI Computer is free to use;
- that explicitly includes use at work and commercial use;
- commercial plans are not required to use Open WebUI Computer;
- optional commercial plans may add Pro/procurement/enterprise benefits;
- the software license distributed with Computer still controls software use.

## Practical effect for SHAMYLI evaluation

Using official Open WebUI Computer as-is for personal or business work is not automatically a paid-license dependency based on the current published terms.

The important restriction for this experiment is attribution/branding preservation. Do not treat the official product as a white-label SHAMYLI product and do not remove/replace the Open WebUI identity in a distributed or deployed copy unless the applicable license/terms explicitly permit that use.

For the current goal — run a local official tool to operate the user's own machine/site — the license is much less of a blocker than a custom commercial redistribution would be.

## Product decision

This improves the official-only candidate materially:

```text
Current official feature fit: high
Current upstream build evidence: green for v0.9.21 Docker GHCR workflow
Current published usage cost requirement: no mandatory commercial plan to use Computer
Custom runtime maintenance: none
Branding/attribution: must be respected
```

If the project later becomes a separately distributed branded SaaS/product, re-check the license and then-current commercial terms before launch.
