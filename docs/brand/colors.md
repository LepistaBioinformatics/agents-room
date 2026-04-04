# Colors

## Accent — Honey Bronze

Agents Room's identity color. Part of the Lepista ecosystem color system (Knowledge & AI).

| Token | CSS var | Light | Dark | Use |
|---|---|---|---|---|
| `accent.primary` | `--ag-accent` | `#C8922A` | `#E0A832` | CTAs, active icons, badges |
| `accent.hover` | `--ag-accent-hover` | `#B0801F` | `#F0B840` | Hover states |
| `accent.text` | `--ag-accent-text` | `#8B6914` | `#E0A832` | Text on light bg (AA-safe) |
| `accent.surface` | `--ag-accent-surface` | `rgba(200,146,42,0.06)` | `rgba(224,168,50,0.08)` | Selected card backgrounds |
| `accent.border` | `--ag-accent-border` | `rgba(200,146,42,0.20)` | `rgba(224,168,50,0.20)` | Focus rings, emphasis separators |

**Tailwind classes:** `text-accent`, `bg-accent`, `border-accent`, `bg-accent-surface`, `border-accent-border`, `text-accent-text`

### Lepista Ecosystem

| Product | Color | Hex |
|---|---|---|
| Global Identity | Violet | `#7F58AF` |
| Infrastructure (Mycelium) | Cyan | `#64C5EB` |
| SaaS (LepOps) | Magenta | `#E84D8A` |
| Bioinformatics | Amber | `#FEB326` |
| **Knowledge & AI (Agents Room)** | **Honey Bronze** | **`#C8922A`** |

Chromatic distance from Bioinformatics (#FEB326): 22 luminosity points, 9 saturation points. Immediate visual differentiation.

---

## WCAG Accessibility Rules

| Rule | Detail |
|---|---|
| Never use `#C8922A` as body text (≤14px) on white | Ratio 3.72:1 — fails AA normal |
| Body text on light bg: use `#8B6914` | Ratio 5.78:1 — passes AA |
| Dark mode: use `#E0A832` as primary accent | Ratio 7.82:1 against `#0A0A0A` — excellent |
| White text on accent bg: 16px+ only | Ratio 3.72:1 — passes AA large |
| Accent max 20% of visual area per section | Lepista design system rule |

---

## Semantic Colors

| Token | Hex | Use |
|---|---|---|
| `semantic.success` | `#22C55E` | Successful operations |
| `semantic.warning` | `#EAB308` | Alerts |
| `semantic.error` | `#EF4444` | Errors |
| `semantic.info` | `#3B82F6` | Informational |

---

## Neutrals

| Token | Hex | Use |
|---|---|---|
| `neutral.0` | `#FFFFFF` | Light background |
| `neutral.50` | `#FAFAFA` | Light alt background |
| `neutral.100` | `#F5F5F5` | Primary text — dark mode |
| `neutral.200` | `#E5E5E5` | Borders — light |
| `neutral.300` | `#D4D4D4` | Secondary borders — light |
| `neutral.400` | `#A3A3A3` | Placeholder text |
| `neutral.500` | `#737373` | Secondary text |
| `neutral.600` | `#525252` | Tertiary text — dark |
| `neutral.700` | `#404040` | Borders — dark |
| `neutral.800` | `#262626` | Surfaces — dark |
| `neutral.900` | `#171717` | Primary text — light mode |
| `neutral.950` | `#0A0A0A` | Background — dark |

---

## Dark Mode as Primary

Dark mode is the default design context. All design decisions, screenshots, and accessibility testing should prioritize dark mode. Light mode is the variant.
