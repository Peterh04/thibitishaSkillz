---
name: frontend-craft
description: >-
  Audits and builds Thibitisha frontend to a senior human designer/engineer bar:
  anti-AI-slop UI, sophisticated React architecture, accessibility, and API UX.
  Use when working on frontend, UI, pages, components, styling, Vite/React, or
  when the user asks for polished company-grade interface work.
---

# Frontend craft (senior human bar)

## Before coding UI

1. Call MCP `frontend_design_bar` and `frontend_audit` (or run the repo scanner).
2. Define visual direction: palette tokens, type pairing, motion intent — not “default shadcn purple”.
3. Map flows: seeker (CV → skills → assessment → apply) and employer (jobs → matches → applications).

## Build standard

- Replace Vite scaffold entirely for product surfaces.
- Structure: `src/app` or routes, `features/*`, `shared/ui`, `shared/api`, layouts.
- Every screen: loading / empty / error / success; optimistic only when safe.
- Forms: inline validation, disabled submit while pending, server error mapping.
- Auth: protected routes; token strategy documented; logout clears client state.
- Assessment UX: progress, clear question types, confirm submit, results with feedback — not a raw JSON dump.

## Design checklist (pass before done)

- [ ] First viewport is one composition; brand readable without nav
- [ ] No purple-gradient / Inter-default / pill-stat AI look
- [ ] Real visual hierarchy; restrained motion; works on mobile
- [ ] Contrast and labels are accessible
- [ ] Feels like a hiring product, not a component gallery

## Output quality

Write sophisticated, maintainable React — clean composition, no dead Vite leftovers, no “slop” layouts. Prefer redesign over bolting features onto the starter template.
