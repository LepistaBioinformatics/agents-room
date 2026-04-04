# Skill / Command Creation — Task Breakdown

**Feature:** SCREATE-01..05  
**Spec:** `.specs/features/skill-command-creation/spec.md`  
**Status:** In progress

---

## Task Graph

```
T1 (IPC main) ──┐
T3 (i18n)       ├──► T2 (preload) ──► T4 (CreateSkillDrawer)  ──┐
                │                 ──► T5 (CreateCommandDrawer) ──┤──► T8 (+ buttons) ──► T9 (AgentsRoom wiring)
                │                 ──► T6 (SkillDetailDrawer edit)─┤
                │                 ──► T7 (CommandDetailDrawer edit)┘
```

---

## Tasks

### T1 — IPC handlers (main process)
**What:** Add 5 new `ipcMain.handle` calls to `src/main/ipc-handlers.ts`  
**Where:** `src/main/ipc-handlers.ts` — new section `── Skill / command authoring ──` after the skills install section  
**Depends on:** nothing  
**[P] Parallel with:** T3

**Channels to implement:**

| Channel | Payload | Logic |
|---|---|---|
| `skill:create` | `{ name, description, model, disableModelInvocation, body }` | Validate name (non-empty, no `/\`, no leading `.`). Check `~/.claude/skills/<name>/` does not exist. Create dir with `mkdirSync`. Write `SKILL.md` with frontmatter + body. |
| `skill:update` | `{ folderPath, description, model, disableModelInvocation, body }` | Overwrite `<folderPath>/SKILL.md`. Preserve `name` in frontmatter (read-only). |
| `skill:duplicate` | `{ sourceName, destName }` | Copy all files from `~/.claude/skills/<sourceName>/` to `~/.claude/skills/<destName>/` using `cpSync` (recursive). Remove skill meta from store for destName (it's now a local copy). |
| `command:create` | `{ name, description, body, destPath }` | `destPath` is the resolved commands dir (either `~/.claude/commands/` or `<workspacePath>/.claude/commands/`). Create dir if missing. Check `<destPath>/<name>.md` doesn't exist. Write file. |
| `command:update` | `{ filePath, description, body }` | Overwrite `filePath`. For description: inject/update YAML-style first line if present, else prepend. Actually, simplest is to re-derive from body: first non-empty line of body is description. Just overwrite the full file content. |

**SKILL.md frontmatter format** (from existing reader — see `src/main/agents-reader.ts`):
```yaml
---
name: <name>
description: <description>
model: <model>        # omit if empty
disable-model-invocation: true  # omit if false
---
<body>
```

**command .md format:** Body is the full file content. Description is inferred by reader from first non-empty line — no extra format needed.

**Return shapes:**
- `{ success: true }` on success
- `{ error: string }` on failure (include OS error message)
- `skill:create` additionally returns `{ error: 'NAME_CONFLICT' }` on conflict
- `command:create` additionally returns `{ error: 'NAME_CONFLICT' }` on conflict

**Done when:**
- [ ] All 5 channels registered and callable
- [ ] `skill:create` creates the folder + SKILL.md
- [ ] `skill:update` overwrites SKILL.md, preserving name
- [ ] `skill:duplicate` copies folder, removes meta for copy
- [ ] `command:create` creates .md in correct location
- [ ] `command:update` overwrites .md

**Gate:** `npm run typecheck` passes

---

### T2 — Preload bridge
**What:** Expose the 5 new IPC channels in `src/preload/index.ts` under a new `skillAuthoring` namespace  
**Where:** `src/preload/index.ts`  
**Depends on:** T1 (channel names must match)

**Add to `ElectronAPI`:**
```ts
skillAuthoring: {
  createSkill: (payload: { name: string; description: string; model: string; disableModelInvocation: boolean; body: string }) => Promise<{ success?: boolean; error?: string }>
  updateSkill: (payload: { folderPath: string; description: string; model: string; disableModelInvocation: boolean; body: string }) => Promise<{ success?: boolean; error?: string }>
  duplicateSkill: (payload: { sourceName: string; destName: string }) => Promise<{ success?: boolean; error?: string }>
  createCommand: (payload: { name: string; description: string; body: string; destPath: string }) => Promise<{ success?: boolean; error?: string }>
  updateCommand: (payload: { filePath: string; description: string; body: string }) => Promise<{ success?: boolean; error?: string }>
}
```

**Done when:**
- [ ] `ElectronAPI.skillAuthoring` type defined
- [ ] All 5 methods wired via `ipcRenderer.invoke`
- [ ] `window.electronAPI.skillAuthoring` accessible in renderer
- [ ] `npm run typecheck` passes

---

### T3 — i18n strings
**What:** Add all new translation keys to `src/renderer/src/i18n/locales/en-US.json`  
**Where:** `src/renderer/src/i18n/locales/en-US.json`  
**Depends on:** nothing  
**[P] Parallel with:** T1

**New keys to add** (under new top-level `"create"` section):
```json
"create": {
  "newSkill": "New skill",
  "newCommand": "New command",
  "skillName": "Skill name",
  "skillNamePlaceholder": "e.g. my-skill",
  "skillDescription": "Description",
  "skillDescriptionPlaceholder": "What does this skill do?",
  "skillModel": "Model override",
  "skillModelPlaceholder": "e.g. claude-opus-4-6 (optional)",
  "skillDisableModel": "Disable model invocation",
  "skillBody": "Skill prompt (body)",
  "skillBodyPlaceholder": "Write your skill prompt here…",
  "commandName": "Command name",
  "commandNamePlaceholder": "e.g. my-command",
  "commandDescription": "Description (optional)",
  "commandDescriptionPlaceholder": "Briefly describe what this command does",
  "commandDestination": "Destination",
  "commandDestGlobal": "Global (~/.claude/commands/)",
  "commandBody": "Command body",
  "commandBodyPlaceholder": "Write your command content here…",
  "create": "Create",
  "creating": "Creating…",
  "nameConflict": "A {{type}} named \"{{name}}\" already exists in that location.",
  "nameInvalid": "Name must be non-empty, without path separators or a leading dot.",
  "bodyEmpty": "Body is empty — the {{type}} will be saved without content.",
  "discardConfirm": "Discard unsaved changes?",
  "editSkill": "Edit skill",
  "editCommand": "Edit command",
  "edit": "Edit",
  "duplicateEdit": "Duplicate & Edit",
  "duplicating": "Duplicating…",
  "saveChanges": "Save changes",
  "discardChanges": "Discard",
  "editMode": "Editing",
  "copyNameSuffix": "-copy"
}
```

**Done when:**
- [ ] All keys present in en-US.json
- [ ] No JSON syntax errors

---

### T4 — CreateSkillDrawer component
**What:** New component `src/renderer/src/components/CreateSkillDrawer.tsx` for SCREATE-01  
**Where:** New file  
**Depends on:** T2, T3

**Interface:**
```tsx
interface Props {
  workspacePath: string   // '' for global; not used for skill creation (skills always go to ~/.claude/skills/)
  open: boolean
  onClose: () => void
  onCreated: () => void   // triggers canvas reload
}
```

**UI (follows DrawerShell + existing patterns):**
- Header: "New skill" title + X close button
- Fields: name (required, text input), description (optional), model (optional), disableModelInvocation (toggle), body (textarea, tall, required)
- Submit button: "Create" / "Creating…" busy state
- Inline error below name field for NAME_CONFLICT and invalid name
- Warn (non-blocking yellow note) if body is empty
- On unsaved changes + close: show `window.confirm(t('create.discardConfirm'))`

**Behavior:**
1. Validate name on submit (client-side first)
2. Call `window.electronAPI.skillAuthoring.createSkill(...)`
3. On `NAME_CONFLICT`: show inline error, do not close
4. On OS error: show error alert, do not close
5. On success: call `onCreated()`, reset form, close

**Styling:** Follow SkillDetailDrawer header style. Body textarea: `font-mono text-xs`, min-height ~200px.

**Done when:**
- [ ] Component renders without errors
- [ ] Form validates correctly
- [ ] Successful creation calls onCreated and closes
- [ ] NAME_CONFLICT shows inline error
- [ ] Unsaved changes confirm on close
- [ ] `npm run typecheck` passes

---

### T5 — CreateCommandDrawer component
**What:** New component `src/renderer/src/components/CreateCommandDrawer.tsx` for SCREATE-02  
**Where:** New file  
**Depends on:** T2, T3

**Interface:**
```tsx
interface Props {
  workspaces: WorkspaceEntry[]    // for destination selector
  defaultWorkspacePath?: string   // pre-select this workspace in destination
  open: boolean
  onClose: () => void
  onCreated: (workspacePath: string) => void  // triggers reload for the right workspace
}
```

**Destination resolution logic:**
- Option 0: "Global" → destPath = `~/.claude/commands/` (resolve via homedir())
- Option N: workspace.name → destPath = `<workspace.path>/.claude/commands/`
- Note: destPath is computed main-side since homedir is known there. Renderer passes the workspace path (`''` for global, absolute path for workspace), and main resolves the commands dir.

**Payload to IPC:** `{ name, description, body, workspacePath: selectedWorkspacePath }`  
→ Rename `destPath` in preload to `workspacePath` for clarity, main resolves.  
Or keep destPath and resolve it in renderer using `''` for global (main already has homedir).  
**Decision:** Pass `workspacePath` (not destPath); main derives commands dir from it.  
Update T1 and T2 accordingly: `command:create` payload = `{ name, description, body, workspacePath }`.

**UI:**
- Header: "New command" + X
- Fields: destination selector (dropdown: Global + each workspace with path), name, description (optional), body (textarea)
- Same validation + error + confirm patterns as T4

**Done when:**
- [ ] Destination selector shows all workspaces + Global
- [ ] Correct path used per destination
- [ ] NAME_CONFLICT shows inline error
- [ ] onCreated called with correct workspacePath
- [ ] `npm run typecheck` passes

---

### T6 — Edit mode in SkillDetailDrawer (SCREATE-03 + SCREATE-05)
**What:** Add edit mode and Duplicate & Edit flow to `src/renderer/src/components/SkillDetailDrawer.tsx`  
**Where:** `src/renderer/src/components/SkillDetailDrawer.tsx`  
**Depends on:** T2, T3

**New props:**
```tsx
onEdited?: () => void        // reload after save
```

**Edit button logic:**
- Skill has `meta` (installed) → show "Duplicate & Edit" button
- Skill has no `meta` (local) → show "Edit" button
- Both appear in the drawer header, next to the X button

**Edit mode state:** `useState<'view' | 'edit'>('view')`

**Edit mode UI (same DrawerShell, replace content):**
- Name: read-only display (no input — renaming folder is destructive)
- Description: text input (pre-filled)
- Model: text input (pre-filled)
- disableModelInvocation: toggle (pre-filled)
- Body: textarea (mono, tall, pre-filled with current body)
- Footer buttons: "Save changes" + "Discard"

**Save flow:**
1. Call `window.electronAPI.skillAuthoring.updateSkill({ folderPath: skill.folderPath, ... })`
2. On success: call `onEdited?.()` (reload), stay in view mode, show brief "Saved!" confirmation

**Duplicate & Edit flow:**
1. Derive destName: `<folderName>-copy`; if `~/.claude/skills/<destName>/` exists, try `-copy-2`, etc. (renderer checks via attempting the IPC call)
   - Actually: call `skill:duplicate` with `sourceName` + `destName`; if conflict, main returns error and renderer appends `-2`, etc.
   - Simpler: compute suffix in renderer by checking known skill names (passed down), or just let main handle suffix resolution.
   - **Decision:** Main handles suffix resolution in `skill:duplicate`. Returns `{ success: true, destName: <actual name used> }`. Renderer then calls `onEdited?.()` to reload, and sets the new skill copy as selected.
   - Update T1: `skill:duplicate` returns `{ success: true, destName: string }` — main finds available suffix.
2. While duplicating: show "Duplicating…" spinner in button
3. On success: call `onEdited?.()` and `onDuplicated?.(destName)` — so parent can select the new copy

**New optional prop:**
```tsx
onDuplicated?: (newSkillName: string) => void
```

**Done when:**
- [ ] "Edit" button appears for local skills, "Duplicate & Edit" for installed
- [ ] Edit mode pre-fills all fields
- [ ] Save calls updateSkill, shows "Saved!", calls onEdited
- [ ] Discard with changes asks confirmation
- [ ] Duplicate & Edit creates copy, calls onEdited + onDuplicated
- [ ] `npm run typecheck` passes

---

### T7 — Edit mode in CommandDetailDrawer (SCREATE-04)
**What:** Add edit mode to `src/renderer/src/components/CommandDetailDrawer.tsx`  
**Where:** `src/renderer/src/components/CommandDetailDrawer.tsx`  
**Depends on:** T2, T3

**New props:**
```tsx
onEdited?: () => void
```

**Same pattern as T6** but simpler (no duplicate flow):
- "Edit" button in header for all commands
- Edit mode: name (read-only), description (text input), body (textarea)
- Save → `window.electronAPI.skillAuthoring.updateCommand({ filePath: command.filePath, description, body })`
- On success: `onEdited?.()`, return to view mode, show "Saved!"

**Done when:**
- [ ] "Edit" button appears in header
- [ ] Edit mode works, save calls updateCommand
- [ ] onEdited called on success
- [ ] Discard confirms if dirty
- [ ] `npm run typecheck` passes

---

### T8 — "+" buttons in SubgroupLabel / WorkspaceGroupBox
**What:** Add "+" action buttons to the Skills and Commands subgroup headers in `WorkspaceGroupBox.tsx`  
**Where:** `src/renderer/src/components/WorkspaceGroupBox.tsx`  
**Depends on:** T4, T5 (interfaces defined)

**Change `SubgroupLabel`:**
```tsx
function SubgroupLabel({ color, label, count, onAdd }: { 
  color: string; label: string; count: number; onAdd?: () => void 
}): JSX.Element
```
Add a small `+` button (lucide `Plus` icon, 12px) on the right side of the subgroup label when `onAdd` is provided.  
The button must `stopPropagation` on mousedown to prevent GroupBox drag.

**Add new props to `WorkspaceGroupBox`:**
```tsx
onCreateSkill?: () => void
onCreateCommand?: () => void
```

**Wire:**
- Skills `SubgroupLabel` → `onAdd={onCreateSkill}`
- Commands `SubgroupLabel` → `onAdd={onCreateCommand}`
- Also show "+" even when count is 0 (so skills/commands with 0 items still show the subgroup label + add button)

**Empty state change:** When a workspace has 0 skills or 0 commands, still render the subgroup section with just the label (to show the + button). Only hide the CardGrid if empty.

**Done when:**
- [ ] "+" button visible on Skills and Commands subgroup headers
- [ ] Click calls the correct callback
- [ ] Button doesn't trigger GroupBox drag
- [ ] Shown even when count is 0
- [ ] `npm run typecheck` passes

---

### T9 — AgentsRoom wiring
**What:** Wire all new create/edit drawers and reload callbacks in `AgentsRoom.tsx`  
**Where:** `src/renderer/src/components/AgentsRoom.tsx`  
**Depends on:** T4, T5, T6, T7, T8

**State to add:**
```tsx
const [createSkillOpen, setCreateSkillOpen] = useState(false)
const [createSkillWorkspacePath, setCreateSkillWorkspacePath] = useState('')
const [createCommandOpen, setCreateCommandOpen] = useState(false)
const [createCommandDefaultWorkspacePath, setCreateCommandDefaultWorkspacePath] = useState<string | undefined>(undefined)
```

**Callbacks:**
- `handleCreateSkill(workspacePath: string)` → `setCreateSkillWorkspacePath(workspacePath); setCreateSkillOpen(true)`
- `handleCreateCommand(workspacePath: string)` → `setCreateCommandDefaultWorkspacePath(workspacePath); setCreateCommandOpen(true)`
- Pass these down: `AgentsCanvas` → `WorkspaceGroupBox` → as `onCreateSkill` / `onCreateCommand` (with the entry's `path` bound)

**Prop threading:**
`AgentsCanvas` needs two new optional props:
```tsx
onCreateSkill?: (workspacePath: string) => void
onCreateCommand?: (workspacePath: string) => void
```
`WorkspaceGroupBox` already gets these from T8. `AgentsCanvas` passes `() => onCreateSkill?.(ws.entry.path)` etc.

**Drawers to add in AgentsRoom render:**
```tsx
<CreateSkillDrawer
  open={createSkillOpen}
  workspacePath={createSkillWorkspacePath}
  onClose={() => setCreateSkillOpen(false)}
  onCreated={() => onReloadWorkspace('global')}
/>

<CreateCommandDrawer
  open={createCommandOpen}
  workspaces={workspaces}
  defaultWorkspacePath={createCommandDefaultWorkspacePath}
  onClose={() => setCreateCommandOpen(false)}
  onCreated={(workspacePath) => onReloadWorkspace(workspacePath || 'global')}
/>
```

**SkillDetailDrawer updates:**
- Add `onEdited={() => onReloadWorkspace('global')}` prop
- Add `onDuplicated={(destName) => { onReloadWorkspace('global') }}` prop (selects the new copy if possible — best effort)

**CommandDetailDrawer updates:**
- Add `onEdited={() => { const ws = selectedCommand?.workspacePath ?? ''; onReloadWorkspace(ws || 'global') }}`

**Done when:**
- [ ] "+" on Skills opens CreateSkillDrawer
- [ ] "+" on Commands opens CreateCommandDrawer
- [ ] After create, canvas reloads and new card appears
- [ ] After edit skill/command, card reflects changes
- [ ] After duplicate, both copies appear on canvas
- [ ] `npm run typecheck` + app runs without errors

---

## Status Summary

| Task | Depends on | Parallel | Status |
|---|---|---|---|
| T1 — IPC handlers | — | T3 | Planned |
| T2 — Preload bridge | T1 | — | Planned |
| T3 — i18n strings | — | T1 | Planned |
| T4 — CreateSkillDrawer | T2, T3 | T5, T6, T7 | Planned |
| T5 — CreateCommandDrawer | T2, T3 | T4, T6, T7 | Planned |
| T6 — SkillDetailDrawer edit | T2, T3 | T4, T5, T7 | Planned |
| T7 — CommandDetailDrawer edit | T2, T3 | T4, T5, T6 | Planned |
| T8 — "+" buttons in GroupBox | T4, T5 | — | Planned |
| T9 — AgentsRoom wiring | T4..T8 | — | Planned |

## Traceability

| Req ID | Covered by |
|---|---|
| SCREATE-01 | T1 (skill:create), T4 (CreateSkillDrawer), T8 (+), T9 (wiring) |
| SCREATE-02 | T1 (command:create), T5 (CreateCommandDrawer), T8 (+), T9 (wiring) |
| SCREATE-03 | T1 (skill:update), T6 (edit mode), T9 (onEdited) |
| SCREATE-04 | T1 (command:update), T7 (edit mode), T9 (onEdited) |
| SCREATE-05 | T1 (skill:duplicate), T6 (Duplicate & Edit), T9 (onDuplicated) |
