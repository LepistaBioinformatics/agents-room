# UI Foundation — Spec

## Problem Statement

The codebase has two related maintenance problems:

1. **Structural duplication**: `SectionHeader`, the drawer shell (backdrop + container + Escape handler), the info table pattern, and the danger zone with two-step confirmation are copy-pasted across `AgentDetailDrawer`, `SkillDetailDrawer`, and `WorkspaceDetailDrawer`. Any visual change requires editing 3+ files in sync.

2. **No i18n**: ~120 user-facing strings are hardcoded across 15 components, mixed between Portuguese and English with no consistent locale strategy. Localization is impossible without a full grep-and-replace.

## Goals

- [ ] Extract shared drawer primitives so structural changes propagate from one place
- [ ] Implement react-i18next with a single `en-US` locale file covering all user-facing strings
- [ ] Replace all Portuguese strings with their English equivalents via the locale file
- [ ] Zero visual regressions — no UI change visible to the user

## Out of Scope

| Feature | Reason |
|---|---|
| pt-BR locale file | Out of scope; infra is in place after this feature |
| Other locales | Same |
| i18n for main process strings (IPC error codes) | Those are internal; only renderer strings are scoped |
| Plural rules / ICU message format | Simple interpolation is sufficient for v1 |

---

## Requirements

### UI-FOUND-01 — Shared drawer primitives [P1]

Extract the following into `src/renderer/src/components/ui/`:

**`DrawerShell`** — wraps backdrop + container + Escape key handler:
- Props: `onClose: () => void`, `width?: string` (default `'w-[90%] sm:w-1/2'`), `children: React.ReactNode`
- Renders: fixed backdrop (z-40) + sliding panel (z-50) with Escape key listener
- Used by: AgentDetailDrawer, SkillDetailDrawer, WorkspaceDetailDrawer, BrowseSkillsPanel (custom width)

**`SectionBlock`** — section container with header and optional content:
- Props: `icon: React.ReactNode`, `label: string`, `children: React.ReactNode`, `noBorder?: boolean`
- Renders: `border-b border-ag-border px-6 py-5` wrapper + `SectionHeader` (icon + uppercase label) + children below
- Used by: all 3 drawers

**`InfoTable`** — divided key-value table:
- Props: `rows: Array<{ key: string; value: React.ReactNode; mono?: boolean }>`
- Renders: `rounded-xl border border-ag-border bg-ag-surface-2 divide-y divide-ag-border overflow-hidden` with `flex gap-4 px-4 py-2.5 text-xs` rows; key column is always `font-mono text-ag-text-3 w-32 shrink-0`
- Used by: AgentDetailDrawer (Metadata), SkillDetailDrawer (Info + Origin)

**`DangerZone`** — two-step destructive action section:
- Props: `title: string`, `description: React.ReactNode`, `buttonLabel: string`, `confirmLabel: string`, `onConfirm: () => void | Promise<void>`, `busy?: boolean`, `confirmTimeout?: number` (ms, default 3000)
- Renders: red-bordered section, two-step confirm button (first click → `confirmLabel` state with timeout reset, second click → `onConfirm`)
- Used by: SkillDetailDrawer (uninstall), WorkspaceDetailDrawer (delete workspace)

**AC**:
1. All 3 drawers use `DrawerShell` — no inline `fixed inset-0 bg-black/50` code left in them
2. `SectionBlock` replaces all inline `border-b border-ag-border px-6 py-5` + `SectionHeader` combos
3. `InfoTable` replaces both inline table patterns
4. `DangerZone` replaces both inline danger sections
5. No new props added to any drawer — external interfaces unchanged
6. `tsc --noEmit` passes

---

### UI-FOUND-02 — react-i18next setup [P1]

Install and configure `react-i18next` + `i18next`:

- Init file: `src/renderer/src/i18n/index.ts`
- Single locale file: `src/renderer/src/i18n/locales/en-US.json`
- Namespace: `translation` (default, no namespace prefix needed in components)
- Language detection: hardcoded `'en-US'` for v1 (no browser detection needed yet)
- All strings organized in a nested JSON by UI area (see Design)
- Export `useT` re-export from the init file for convenience (just re-exports `useTranslation`)

**AC**:
1. `i18next` and `react-i18next` installed as dependencies
2. `I18nextProvider` wraps the app in `src/renderer/src/main.tsx`
3. `en-US.json` contains all user-facing strings
4. `tsc --noEmit` passes

---

### UI-FOUND-03 — Replace all hardcoded strings [P1]

Every user-facing string in every renderer component uses `t('key')` from `useTranslation()`.

This includes:
- Button labels, section headers, placeholders, tooltips (`title="..."`), empty states, error messages
- All currently-Portuguese strings (converted to English in `en-US.json`)
- Interpolated strings (e.g., `"{count} workspace{count !== 1 ? 's' : ''}"`) using i18next `count` interpolation

**AC**:
1. `grep -r 'title="' src/renderer/src/components` finds no non-icon strings (icons are fine)
2. No Portuguese string literals remain in any `.tsx` file
3. All `placeholder="..."` values come from `t()`
4. `tsc --noEmit` passes

---

## Success Criteria

- [ ] Any structural change to the drawer shell (e.g., animation, backdrop opacity) requires editing 1 file
- [ ] Any copy change (e.g., "Save" → "Apply") requires editing only `en-US.json`
- [ ] All Portuguese strings are gone from component files
- [ ] `tsc --noEmit` clean throughout
- [ ] Visual output identical to pre-refactor
