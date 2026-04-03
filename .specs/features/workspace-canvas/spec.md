# Workspace Canvas — Feature Specification

## Problem Statement

The current canvas shows all agents in a flat grid without workspace context. Users managing multiple projects need to see agents and skills grouped by workspace, move items between workspaces, and manage the lifecycle of those items (duplicate, copy, trash, restore, delete).

## Goals

- [ ] Canvas organizes items by workspace as draggable group boxes
- [ ] Each group box contains agents and skills as distinct subgroups
- [ ] Users can manage multiple workspaces via a toggle sidebar
- [ ] Full lifecycle management: copy, duplicate, trash, restore, permanent delete
- [ ] Contrast and visual hierarchy improved throughout

## Out of Scope (v1)

| Feature | Reason |
|---|---|
| CLAUDE.md cards | v2 — needs in-app editor |
| Settings visualization | v2 |
| Hooks management | v2 |
| MCP servers | v2 |
| Workspace metadata images | v2 — emoji/name sufficient for v1 |

---

## User Stories

### P1: Multi-workspace sidebar [WC-01]

**User Story:** As a user, I want a toggleable sidebar listing all my workspaces so I can add, remove, and annotate them without leaving the canvas.

**Acceptance Criteria:**
1. WHEN app loads THEN system SHALL show a collapsible left sidebar (default: open)
2. WHEN sidebar is open THEN system SHALL list: Global (~/.claude) + all saved workspaces
3. WHEN user clicks "Add workspace" THEN system SHALL open folder picker and add new entry
4. WHEN user adds a workspace THEN system SHALL persist it in store.json with id, path, name, emoji, tags
5. WHEN user clicks workspace emoji/name THEN system SHALL allow inline editing of name and emoji
6. WHEN user adds tags to a workspace THEN system SHALL persist them
7. WHEN user clicks "×" on a workspace THEN system SHALL remove it from sidebar and canvas (not delete files)
8. WHEN sidebar toggle is clicked THEN system SHALL animate collapse/expand (width: 0 ↔ 240px)

**Independent Test:** Add 3 workspaces → all appear in sidebar and canvas → close/reopen → persisted

---

### P1: Canvas group boxes [WC-02]

**User Story:** As a user, I want each workspace rendered as a draggable group box on the canvas so I can arrange my team visually.

**Acceptance Criteria:**
1. WHEN canvas renders THEN system SHALL show one group box per workspace (Global + each saved workspace)
2. WHEN group box renders THEN system SHALL display workspace name + emoji in header
3. WHEN user drags a group box header THEN system SHALL move the box freely on the canvas
4. WHEN user releases drag THEN system SHALL persist box position in store.json
5. WHEN app reloads THEN system SHALL restore each box to its last position
6. WHEN a workspace has no agents or skills THEN system SHALL show an empty state message inside the box

**Independent Test:** Drag boxes to arbitrary positions → reload → positions restored

---

### P1: Agents and skills subgroups [WC-03]

**User Story:** As a user, I want agents and skills displayed as distinct subgroups within each workspace box so I can differentiate them at a glance.

**Acceptance Criteria:**
1. WHEN a workspace has agents THEN system SHALL render an "Agents" subgroup section
2. WHEN a workspace has skills THEN system SHALL render a "Skills" subgroup section
3. WHEN either subgroup is empty THEN system SHALL hide that subgroup (no empty section)
4. WHEN rendering agents THEN system SHALL use ≤ 4 cards per row
5. WHEN rendering skills THEN system SHALL use ≤ 4 cards per row, with distinct visual style (see design)
6. WHEN a skill card renders THEN system SHALL show: name, description preview, model (if set)
7. WHEN a commands subgroup exists THEN system SHALL render it with skills aesthetic + "cmd" label

**Independent Test:** Workspace with 6 agents + 3 skills → agents in 2 rows of 4+2, skills in 1 row of 3

---

### P1: Lifecycle management — copy & duplicate [WC-04]

**User Story:** As a user, I want to copy or duplicate agents and skills so I can reuse them across workspaces.

**Acceptance Criteria:**
1. WHEN user right-clicks an agent card THEN system SHALL show context menu: Copy to workspace, Duplicate, Move to trash
2. WHEN user selects "Copy to workspace" THEN system SHALL show submenu of available target workspaces
3. WHEN user confirms copy THEN system SHALL write a copy of the .md file to the target workspace's agents dir
4. WHEN a file with the same name exists in the target THEN system SHALL append `-copy` suffix
5. WHEN user selects "Duplicate" THEN system SHALL create `<name>-copy.md` in the same directory
6. WHEN user duplicates a skill folder THEN system SHALL copy the entire folder as `<name>-copy/`
7. WHEN copy/duplicate succeeds THEN system SHALL reload the affected workspace group box

**Independent Test:** Copy agent from global to workspace → file appears in workspace dir → card appears in workspace box

---

### P1: Lifecycle management — trash & restore [WC-05]

**User Story:** As a user, I want a safe logical trash so I can recover items I accidentally removed.

**Acceptance Criteria:**
1. WHEN user selects "Move to trash" THEN system SHALL move item to `.claude/.trash/<type>/`
2. WHEN item is moved to trash THEN system SHALL record `{ id, originalPath, trashPath, itemName, itemType, trashedAt }` in store.json
3. WHEN item is trashed THEN system SHALL remove it from the workspace canvas immediately
4. WHEN user opens trash panel (trash icon in toolbar) THEN system SHALL list all trashed items with name, workspace, date
5. WHEN user clicks "Restore" on a trashed item THEN system SHALL move file back to originalPath and remove from trash record
6. WHEN originalPath directory no longer exists THEN system SHALL show warning and ask user to pick a new location
7. WHEN an item is already trashed THEN system SHALL show "Delete permanently" option instead of "Move to trash"
8. WHEN user selects "Delete permanently" THEN system SHALL show modal: "This will permanently delete [name]. This cannot be undone." with explicit "Delete permanently" button
9. WHEN user confirms permanent delete THEN system SHALL delete file from `.trash/` dir and remove from store.json

**Independent Test:** Trash agent → disappears from canvas → open trash panel → restore → reappears → trash again → delete permanently → gone from trash panel

---

### P2: Workspace metadata [WC-06]

**User Story:** As a user, I want to annotate each workspace with a name, emoji, and tags for quick identification.

**Acceptance Criteria:**
1. WHEN workspace is added THEN system SHALL auto-generate name from folder name
2. WHEN user clicks the emoji field THEN system SHALL show an emoji picker
3. WHEN user edits the name field THEN system SHALL update immediately in sidebar and group box header
4. WHEN user types tags THEN system SHALL show them as chips below the workspace name in sidebar
5. WHEN user hovers workspace in sidebar THEN system SHALL show edit controls

**Independent Test:** Set emoji + name + tags → reload → all persisted

---

## Edge Cases

- WHEN `.claude/agents/` does not exist in a workspace THEN system SHALL skip silently
- WHEN `.claude/skills/` does not exist THEN system SHALL skip silently
- WHEN `.claude/.trash/` does not exist THEN system SHALL create it on first trash operation
- WHEN two workspaces have agents with the same name THEN system SHALL display both (differentiated by workspace box context)
- WHEN a trashed item's originalPath directory was deleted THEN system SHALL warn on restore

---

## Requirement Traceability

| ID | Story | Status |
|---|---|---|
| WC-01 | Sidebar | ✅ Done |
| WC-02 | Group boxes | ✅ Done |
| WC-03 | Subgroups | ✅ Done |
| WC-04 | Copy/duplicate | ✅ Done |
| WC-05 | Trash/restore | ✅ Done |
| WC-06 | Workspace metadata | ✅ Done |
