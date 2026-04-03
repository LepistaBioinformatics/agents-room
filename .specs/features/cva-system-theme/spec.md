# CVA + System Theme — Feature Specification

## Problem

All colors are hardcoded dark hex values. Adding `class-variance-authority` gives typed variant management and removes duplicated conditional class strings across components. Supporting system theme (`prefers-color-scheme`) gives users whose OS is set to light mode a usable, non-blinding UI.

## Goals

- Install and wire up CVA, clsx, tailwind-merge
- Define a semantic color token system via CSS custom properties
- Register tokens in Tailwind so they are usable as utility classes
- Apply `darkMode: 'media'` so tokens respond to the OS preference automatically
- Replace hardcoded hex colors in all components with semantic token classes
- Use CVA for repeated multi-variant patterns (type badges, card containers)

## Decisions

| # | Decision |
|---|---|
| D-01 | `darkMode: 'media'` — automatic, no JS toggle required |
| D-02 | CSS custom properties in RGB channel format (`R G B`) so Tailwind opacity modifiers work |
| D-03 | Semantic token namespace `ag-*` to avoid collisions with Tailwind built-ins |
| D-04 | CVA used for `typeBadge` and `cardShell` — the two most repeated variant sets |
| D-05 | zinc-* utility classes remain for fine-grained interactive states (hover, focus rings, dividers) |

## Token Map

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--ag-bg` | `10 10 15` | `245 245 250` | App / canvas backdrop |
| `--ag-surface` | `13 13 18` | `255 255 255` | Panels, drawers, toolbar |
| `--ag-surface-2` | `15 15 24` | `240 240 248` | Raised surfaces (group box bg) |
| `--ag-card` | `26 26 38` | `248 248 255` | Agent card bg |
| `--ag-card-skill` | `16 26 20` | `245 252 248` | Skill card bg |
| `--ag-card-cmd` | `26 23 16` | `255 252 240` | Command card bg |
| `--ag-sidebar` | `13 13 20` | `248 248 252` | Sidebar bg |
| `--ag-border` | `42 42 53` | `220 220 232` | Default border |
| `--ag-text-1` | `255 255 255` | `15 15 19` | Primary text |
| `--ag-text-2` | `161 161 170` | `70 70 90` | Secondary text |
| `--ag-text-3` | `113 113 122` | `140 140 160` | Muted / placeholder text |

## Files Affected

| File | Change |
|---|---|
| `package.json` | Add `class-variance-authority`, `clsx`, `tailwind-merge` |
| `tailwind.config.js` | `darkMode: 'media'`, extend `colors.ag.*` |
| `src/renderer/src/assets/main.css` | CSS variable definitions `:root` + `@media (prefers-color-scheme: dark)` |
| `src/renderer/src/lib/utils.ts` | `cn()` helper |
| `src/renderer/src/lib/variants.ts` | `typeBadge`, `cardShell` CVA definitions |
| `src/renderer/src/components/*.tsx` | Replace hex colors with `ag-*` tokens |

## Requirement IDs

| ID | Requirement | Done |
|---|---|---|
| CVA-01 | `cn()` helper available and used in all edited components | [x] |
| CVA-02 | `typeBadge` CVA variant covers agent/skill/command/global/workspace badge styles | [x] |
| CVA-03 | `cardShell` CVA variant covers agent/skill/command card containers | [x] |
| CVA-04 | All hardcoded hex bg colors replaced with `bg-ag-*` tokens | [x] |
| CVA-05 | Light mode renders legibly (no invisible text, no invisible borders) | [x] |
| CVA-06 | Dark mode identical to current design | [x] |
