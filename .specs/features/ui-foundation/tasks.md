# UI Foundation — Tasks

**Spec**: `.specs/features/ui-foundation/spec.md`
**Design**: `.specs/features/ui-foundation/design.md`
**Status**: Ready to execute

---

## Execution Plan

```
Round 1 (parallel):  TASK-01 · TASK-02
Round 2 (parallel):  TASK-03 · TASK-04 · TASK-05  (after TASK-01 + TASK-02)
Round 3 (serial):    TASK-06  (after TASK-03 + TASK-04 + TASK-05)
```

---

## Tasks

### TASK-01 — UI primitives

**Status**: Pending
**Parallel**: Yes (Round 1, alongside TASK-02)
**Depends on**: —

**What**: Create `src/renderer/src/components/ui/` with 4 files:

1. `DrawerShell.tsx` — backdrop + sliding panel + Escape handler
2. `SectionBlock.tsx` — border-b section wrapper + icon/label header + mt-3 children
3. `InfoTable.tsx` — divided key/value table
4. `DangerZone.tsx` — two-step destructive action section

Full signatures and render output in `design.md` → "Primitive Specifications".

**Done when**: All 4 files compile, no TS errors, exported from an `index.ts` barrel in `ui/`.

---

### TASK-02 — i18n setup

**Status**: Pending
**Parallel**: Yes (Round 1, alongside TASK-01)
**Depends on**: —

**What**:
1. Install `i18next` and `react-i18next` via npm
2. Create `src/renderer/src/i18n/index.ts` (init + useT re-export)
3. Create `src/renderer/src/i18n/locales/en-US.json` with ALL strings from design.md
4. Add side-effect import `import './i18n'` to `src/renderer/src/main.tsx`

Do NOT wrap with `I18nextProvider` — react-i18next v13+ with `initReactI18next` plugin doesn't need it; `useTranslation` works directly after `i18n.use(initReactI18next).init(...)`.

**Done when**: `tsc --noEmit` passes; `useTranslation` importable in any component.

---

### TASK-03 — Refactor AgentDetailDrawer

**Status**: Pending
**Parallel**: Yes (Round 2, alongside TASK-04 + TASK-05)
**Depends on**: TASK-01, TASK-02

**What**: Rewrite `src/renderer/src/components/AgentDetailDrawer.tsx`:
- Replace inline backdrop + container with `<DrawerShell onClose={onClose}>`
- Remove local `SectionHeader` helper — use `<SectionBlock>` instead
- Wrap info table rows in `<InfoTable rows={[...]} />`
- Add `const { t } = useTranslation()` and replace every hardcoded string with `t('...')`
- Keys to use: `agent.*`, `common.*` from en-US.json

The drawer has NO DangerZone — skip that primitive here.

**Done when**: No hardcoded user-facing strings remain; `tsc --noEmit` passes; component renders identically.

---

### TASK-04 — Refactor SkillDetailDrawer

**Status**: Pending
**Parallel**: Yes (Round 2, alongside TASK-03 + TASK-05)
**Depends on**: TASK-01, TASK-02

**What**: Rewrite `src/renderer/src/components/SkillDetailDrawer.tsx`:
- Replace inline backdrop + container with `<DrawerShell onClose={onClose}>`
- Remove local `SectionHeader` helper — use `<SectionBlock>` instead
- Wrap metadata rows in `<InfoTable rows={[...]} />`
- Replace Origin + Uninstall sections:
  - Origin: use `<SectionBlock>` with the existing origin table content
  - Uninstall: replace with `<DangerZone>` — wire `onConfirm` to `handleUninstall` logic; pass `busy={uninstallBusy}` 
  - The `uninstallConfirm` / `setTimeout` state can be REMOVED — `DangerZone` handles it internally
- Add `const { t } = useTranslation()` and replace all strings with `t('skill.*')` / `t('common.*')`

**Done when**: No hardcoded strings remain; uninstall still works two-step; `tsc --noEmit` passes.

---

### TASK-05 — Refactor WorkspaceDetailDrawer

**Status**: Pending
**Parallel**: Yes (Round 2, alongside TASK-03 + TASK-04)
**Depends on**: TASK-01, TASK-02

**What**: Rewrite `src/renderer/src/components/WorkspaceDetailDrawer.tsx`:
- Replace inline backdrop + container with `<DrawerShell onClose={onClose}>`
- Remove local `SectionHeader` helper — use `<SectionBlock>` instead
- Replace inline danger zone with `<DangerZone>`:
  - title: `t('workspace.danger.title')`
  - description: `t('workspace.danger.description')`
  - buttonLabel: `t('workspace.danger.button')`
  - confirmLabel: `t('workspace.danger.confirm')`
  - onConfirm: calls `onRemove(workspace.id)` then `onClose()`
  - The existing `confirmDelete` / `setTimeout` state can be REMOVED — `DangerZone` handles it
- Replace all Portuguese and English hardcoded strings with `t('workspace.*')` / `t('common.*')`

**Done when**: No hardcoded strings; delete still works two-step; `tsc --noEmit` passes.

---

### TASK-06 — Replace strings in all other components

**Status**: Pending
**Parallel**: No (Round 3)
**Depends on**: TASK-02 (i18n setup), TASK-03+04+05 (for context on which keys exist)

**What**: Add `const { t } = useTranslation()` and replace ALL hardcoded user-facing strings in:

| Component | Keys namespace |
|---|---|
| `AgentsRoom.tsx` | `nav.*`, `stats.*` |
| `WorkspaceSidebar.tsx` | `nav.*`, `card.*` (Ver detalhes → `card.viewDetails`) |
| `AgentCard.tsx` | `card.*` |
| `SkillCard.tsx` | `card.*` |
| `CommandCard.tsx` | `card.*` |
| `WorkspaceGroupBox.tsx` | `canvas.*` |
| `TrashPanel.tsx` | `trash.*`, `common.*` |
| `CardContextMenu.tsx` | `contextMenu.*` |
| `BrowseSkillsPanel.tsx` | `browse.*`, `common.*` |
| `SystemNode.tsx` | `system.*` |
| `WorkspacePicker.tsx` | `picker.*` |

For plurals in `AgentsRoom.tsx`:
```tsx
// before: `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`
// after:
t('stats.workspaceCount', { count: workspaces.length })
```

**Done when**: `grep -rn '"[A-Z][a-z]' src/renderer/src/components` returns only non-UI strings (class names, IPC channels, etc.); `tsc --noEmit` passes.

---

## Requirement Traceability

| Task | Covers |
|---|---|
| TASK-01 | UI-FOUND-01 AC1–AC5 |
| TASK-02 | UI-FOUND-02 AC1–AC4 |
| TASK-03 | UI-FOUND-01 AC1–AC2 (agent), UI-FOUND-03 (agent strings) |
| TASK-04 | UI-FOUND-01 AC1–AC4 (skill), UI-FOUND-03 (skill strings) |
| TASK-05 | UI-FOUND-01 AC1–AC4 (workspace), UI-FOUND-03 (workspace strings) |
| TASK-06 | UI-FOUND-03 (all remaining strings) |
