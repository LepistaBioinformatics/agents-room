# Iconography

## Decision: Lucide React (exclusive)

**Rule:** Use only Lucide. Never mix icon packs.

| Property | Value |
|---|---|
| Package | `lucide-react` |
| Stroke width | 1.5px |
| Corners | Rounded |
| Inline size | 16px |
| UI size (buttons) | 20px |
| Nav size (sidebar) | 24px |
| Hero size (empty states) | 32px |

---

## Usage Pattern

```tsx
import { Cpu, LayoutDashboard } from 'lucide-react'

// Inline (16px)
<Cpu size={16} strokeWidth={1.5} />

// Button icon (20px)
<GitBranch size={20} strokeWidth={1.5} />

// Sidebar nav (24px)
<LayoutDashboard size={24} strokeWidth={1.5} />

// Empty state hero (32px)
<Search size={32} strokeWidth={1.5} className="text-ag-text-3" />
```

---

## Semantic Mapping

| Concept | Lucide icon | Alternative |
|---|---|---|
| Agent | `cpu` | `circle-dot` |
| Workspace | `layout-dashboard` | `grid-2x2` |
| Connection | `git-branch` | `workflow` |
| Skill | `puzzle` | `package` |
| Trust Tier (high) | `shield-check` | — |
| Trust Tier (medium) | `shield` | — |
| Trust Tier (low) | `shield-alert` | — |
| Annotation | `sticky-note` | `message-square` |
| Trash | `trash-2` | — |
| Settings | `sliders-horizontal` | — |
| GitHub | `github` | — |
| Zoom In/Out | `zoom-in` / `zoom-out` | — |
| Canvas | `move` | `maximize` |
| Search | `search` | — |

---

## Rules

- Default to the primary icon. Use the alternative only when the primary conflicts with nearby content or causes visual ambiguity.
- Icon color inherits from text — use Tailwind text color classes. Never hardcode icon color.
- Active/selected icons use `text-accent` (Honey Bronze).
- Disabled icons use `text-ag-text-3 opacity-40`.
