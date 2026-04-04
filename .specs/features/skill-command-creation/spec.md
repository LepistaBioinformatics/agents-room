# Skill / Command Creation from UI — Feature Specification

## Problem Statement

Skills and commands are created manually by writing files in the filesystem. There is no in-app path to create or edit them. Users who want to author or adjust their skill/command library must leave the app and edit files by hand.

## Goals

- [x] Allow users to create new skills and commands without leaving the app
- [x] Allow users to edit existing skills and commands inline in their detail drawer
- [x] Allow users to duplicate installed skills before editing, preserving the original

## Out of Scope

| Feature | Reason |
|---|---|
| Agent file creation (.md agents) | Separate concern; agent format varies by tool |
| Syntax validation / prompt linting | v3 — requires external tooling |
| Auto-update of duplicated skills when origin is updated | v3 — requires version tracking |
| Template library | Deferred — can be added later without spec change |

---

## User Decisions (gray areas resolved)

| # | Decision |
|---|---|
| Commands scope | Global (`~/.claude/commands/`) **or** per-workspace (`.claude/commands/` inside workspace path) — user chooses destination at creation time |
| Create entry point | "+" button in GroupBox subgroup header **and** sidebar workspace row — both open the same creation drawer |
| Edit location | Inside SkillDetailDrawer / CommandDetailDrawer — inline editor (textarea + save), same pattern as CLAUDE.md editor in WorkspaceDetailDrawer |
| Installed skills | Editable only after duplicating — "Duplicate & Edit" flow creates a local copy with no origin metadata |

---

## User Stories

### P1: Create a new skill [SCREATE-01] ⭐ MVP

**User Story**: As a Claude Code user, I want to create a new skill from the app, so I can author skills without manually writing SKILL.md files.

**Acceptance Criteria**:

1. WHEN user clicks "+" on the Skills subgroup header in a GroupBox OR on the sidebar workspace row THEN system SHALL open a CreateSkillDrawer
2. WHEN drawer opens THEN system SHALL show fields: name (required), description, model (optional, text input), disable-model-invocation (toggle, default off), body (textarea, required)
3. WHEN user submits THEN system SHALL validate: name is non-empty, no path separators (`/` `\`), no leading dot
4. WHEN name conflicts with an existing skill folder THEN system SHALL show inline error: "A skill named X already exists"
5. WHEN validation passes THEN system SHALL create `~/.claude/skills/<name>/SKILL.md` with correct frontmatter + body
6. WHEN file is written THEN system SHALL reload the canvas and show the new skill card immediately
7. WHEN user cancels or closes drawer with unsaved content THEN system SHALL ask for confirmation before discarding

**Independent Test**: Open drawer → fill name + body → submit → verify `~/.claude/skills/<name>/SKILL.md` exists and card appears on canvas.

---

### P1: Create a new command [SCREATE-02] ⭐ MVP

**User Story**: As a Claude Code user, I want to create a new command from the app, so I can author commands without manually writing .md files.

**Acceptance Criteria**:

1. WHEN user clicks "+" on the Commands subgroup header in a GroupBox OR on the sidebar workspace row THEN system SHALL open a CreateCommandDrawer
2. WHEN drawer opens THEN system SHALL show: destination selector (Global / `<workspace name>`), name (required), description (optional), body (textarea, required)
3. WHEN destination is "Global" THEN system SHALL write to `~/.claude/commands/<name>.md`
4. WHEN destination is a workspace THEN system SHALL write to `<workspacePath>/.claude/commands/<name>.md`, creating the directory if needed
5. WHEN user submits THEN system SHALL validate: name is non-empty, no path separators, no leading dot
6. WHEN name conflicts in the chosen destination THEN system SHALL show inline error: "A command named X already exists in that location"
7. WHEN validation passes THEN system SHALL write the file and reload canvas to show the new command card immediately
8. WHEN user cancels with unsaved content THEN system SHALL ask for confirmation before discarding

**Independent Test**: Open drawer → choose destination → fill name + body → submit → verify .md exists in correct folder and card appears.

---

### P1: Edit an existing skill [SCREATE-03] ⭐ MVP

**User Story**: As a Claude Code user, I want to edit a skill's content and metadata from its detail drawer, so I can refine skills without leaving the app.

**Acceptance Criteria**:

1. WHEN user opens a SkillDetailDrawer THEN system SHALL show an "Edit" button in the header (for all skills, including installed ones — see SCREATE-05 for installed flow)
2. WHEN user clicks "Edit" on a skill with no origin metadata THEN system SHALL switch the drawer to edit mode: fields for name (read-only — renaming a folder is a destructive op), description, model, disable-model-invocation toggle, and body textarea pre-filled with current values
3. WHEN user saves THEN system SHALL overwrite `~/.claude/skills/<name>/SKILL.md` with updated content
4. WHEN save succeeds THEN system SHALL reload the skill card without closing the drawer
5. WHEN user discards changes THEN system SHALL return to read mode and ask for confirmation if content was modified

**Independent Test**: Open existing skill drawer → edit description + body → save → verify file updated and card reflects changes.

---

### P1: Edit an existing command [SCREATE-04] ⭐ MVP

**User Story**: As a Claude Code user, I want to edit a command's content from its detail drawer, so I can refine commands without leaving the app.

**Acceptance Criteria**:

1. WHEN user opens a CommandDetailDrawer THEN system SHALL show an "Edit" button in the header
2. WHEN user clicks "Edit" THEN system SHALL switch to edit mode: name (read-only), description, body textarea pre-filled with current content
3. WHEN user saves THEN system SHALL overwrite the command file at its resolved path
4. WHEN save succeeds THEN system SHALL reload the command card without closing the drawer
5. WHEN user discards THEN system SHALL return to read mode with confirmation if content was modified

**Independent Test**: Open existing command drawer → edit body → save → verify file updated and card shows change.

---

### P2: Duplicate an installed skill before editing [SCREATE-05]

**User Story**: As a Claude Code user, I want to duplicate an installed skill and edit the copy, so I can customize it without affecting the original installed version.

**Acceptance Criteria**:

1. WHEN user opens a SkillDetailDrawer for a skill with origin metadata THEN system SHALL show "Duplicate & Edit" instead of a plain "Edit" button
2. WHEN user clicks "Duplicate & Edit" THEN system SHALL:
   - Copy all files from `~/.claude/skills/<name>/` to `~/.claude/skills/<name>-copy/` (appending `-copy`, or `-copy-2` etc. if that also exists)
   - Remove origin metadata from `store.json` for the new copy (the copy is now local)
   - Open the new copy in edit mode in the drawer
3. WHEN duplication completes THEN system SHALL show the new copy card on the canvas alongside the original
4. WHEN user saves the copy THEN system SHALL write to the copy's path, leaving the original untouched

**Independent Test**: Open installed skill → "Duplicate & Edit" → verify `<name>-copy/` created, no origin metadata, original unchanged; save changes to copy → original file unmodified.

---

## Edge Cases

- WHEN a skill name contains only spaces THEN treat as empty (fail validation)
- WHEN `~/.claude/skills/` does not exist THEN create it before writing
- WHEN `<workspacePath>/.claude/commands/` does not exist THEN create it before writing
- WHEN the file write fails (permissions, disk full) THEN show error with the OS message; do not close the drawer
- WHEN skill body is empty THEN warn but allow saving (some skills are frontmatter-only)
- WHEN command body is empty THEN warn but allow saving

---

## IPC Channels Required

| Channel | Direction | Purpose |
|---|---|---|
| `skill:create` | renderer → main | Write new SKILL.md; payload: `{ name, description, model, disableModelInvocation, body }` |
| `skill:update` | renderer → main | Overwrite existing SKILL.md; payload: same as create + folder path |
| `skill:duplicate` | renderer → main | Copy skill folder; payload: `{ sourceName, destName }` |
| `command:create` | renderer → main | Write new command .md; payload: `{ name, description, body, destPath }` |
| `command:update` | renderer → main | Overwrite existing command .md; payload: `{ filePath, name, description, body }` |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SCREATE-01 | Create skill | Execute | Done |
| SCREATE-02 | Create command | Execute | Done |
| SCREATE-03 | Edit skill | Execute | Done |
| SCREATE-04 | Edit command | Execute | Done |
| SCREATE-05 | Duplicate installed skill | Execute | Done |

---

## Success Criteria

- [x] User can create a skill and see it on the canvas without touching the filesystem
- [x] User can create a command targeting global or a specific workspace
- [x] User can edit any skill/command inline in its detail drawer
- [x] Installed skills require explicit duplication before editing; the original is never modified
- [x] All write errors surface with clear, actionable messages
