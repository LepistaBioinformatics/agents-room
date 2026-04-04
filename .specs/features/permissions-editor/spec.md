# Permissions Editor — Feature Specification

## Problem Statement

Claude Code's `settings.json` files are currently displayed as read-only formatted JSON in the Workspace detail drawer. Users who want to manage their permission rules (`allow`, `ask`, `deny`) must open a text editor, remember the exact syntax, and manually edit raw JSON — a friction-heavy flow that makes mistakes easy and discoverability zero. There is no in-app way to add, remove, or modify permission rules.

## Goals

- [ ] Users can view, add, and remove permission rules in `allow`, `ask`, and `deny` from within the app
- [ ] The editor understands official Claude Code permission syntax and offers structured inputs (tool picker, pattern builder, folder picker for path-based rules)
- [ ] Changes are written back to the correct `settings.json` file immediately
- [ ] The editor works for both global (`~/.claude/settings.json`) and per-workspace (`.claude/settings.json`) settings

## Out of Scope

| Feature | Reason |
|---|---|
| Full JSON editor for all settings keys | Too broad; focus on permissions. Other keys remain read-only |
| Editing `settings.local.json` | Local overrides are user-private; deferred |
| `sandbox` section editing | Complex nested structure; deferred |
| `hooks` section editing | Separate feature |
| Drag-to-reorder rules | Nice-to-have, deferred |
| Rule testing / dry-run | Complex; deferred |

---

## Claude Code Permission Syntax Reference

This is built into the editor as structured knowledge.

### Tool Namespaces

| Tool | Pattern | Example |
|---|---|---|
| `Bash` | Command string, supports `*` wildcard | `Bash(npm run *)` |
| `Read` | File path / glob (gitignore-style) | `Read(~/secrets/**)` |
| `Edit` | File path / glob | `Edit(/src/**/*.ts)` |
| `Write` | File path / glob | `Write(/tmp/**)` |
| `Glob` | — (bare, no specifier needed) | `Glob` |
| `Grep` | — (bare) | `Grep` |
| `WebFetch` | `domain:<hostname>` | `WebFetch(domain:github.com)` |
| `WebSearch` | — (bare) | `WebSearch` |
| `mcp__<server>` | `mcp__<server>__<tool>` or just `mcp__<server>` | `mcp__puppeteer__navigate` |
| `Agent` | Agent name | `Agent(Explore)` |

### Path Prefix Conventions (for Read/Edit/Write)

| Prefix | Meaning | Example |
|---|---|---|
| `//path` | Absolute filesystem path | `Read(//home/alice/secrets/**)` |
| `~/path` | Home directory | `Read(~/Documents/*.pdf)` |
| `/path` | Project root | `Edit(/src/**)` |
| `./path` or `path` | Current directory | `Read(.env)` |

### `defaultMode` Valid Values

`default` | `acceptEdits` | `plan` | `dontAsk` | `bypassPermissions` | `auto`

---

## User Stories

### P1: View permissions as a structured list, not raw JSON [PERM-01] ⭐ MVP

**User Story**: As a Claude Code user, I want to see the `allow`, `ask`, and `deny` rules in a readable list instead of raw JSON, so I can quickly understand what is permitted for a workspace.

**Why P1**: Foundation for all editing. Switching from raw JSON to structured display is the minimum that makes the feature useful.

**Acceptance Criteria**:

1. WHEN user opens a workspace's settings section THEN system SHALL detect if a `settings.json` exists with a `permissions` key
2. WHEN `permissions` exists THEN system SHALL render three collapsible sections: Allow, Ask, Deny — each listing its rules as individual chips/rows
3. WHEN a rule has a known tool prefix (Bash, Read, Edit, Write, WebFetch, etc.) THEN system SHALL render it with a color-coded tool badge and the specifier separately
4. WHEN a rule has an unknown/custom prefix THEN system SHALL render it as plain text with a "custom" badge
5. WHEN a rule list is empty THEN system SHALL show "No rules" in that section
6. WHEN `permissions` key does not exist in the file THEN system SHALL show an "Add permissions section" affordance

**Independent Test**: Open a workspace with known `settings.json` → see Allow/Ask/Deny as structured lists.

---

### P1: Add a permission rule [PERM-02] ⭐ MVP

**User Story**: As a Claude Code user, I want to add a new rule to Allow, Ask, or Deny using a guided form that knows about official Claude Code tools and patterns, so I don't have to remember exact syntax.

**Why P1**: Without add, the display is read-only. This is the core editing action.

**Acceptance Criteria**:

1. WHEN user clicks "+ Add Rule" in any of the three sections THEN system SHALL open an inline form
2. WHEN the form opens THEN system SHALL show a tool selector with all official tools: Bash, Read, Edit, Write, Glob, Grep, WebFetch, WebSearch, mcp__, Agent — plus a "Custom" option
3. WHEN user selects a tool that accepts a specifier THEN system SHALL show a context-aware specifier input:
   - `Bash`: free-text input with a `*` wildcard hint and example placeholder
   - `Read` / `Edit` / `Write`: text input for path + a folder-picker button (opens OS dialog) + path prefix selector (`//`, `~/`, `/`, `./`)
   - `WebFetch`: fixed prefix `domain:` + hostname input
   - `mcp__`: two inputs — server name + optional tool name
   - `Agent`: agent name input
   - `Glob`, `Grep`, `WebSearch`: no specifier (bare rule)
4. WHEN user selects "Custom" THEN system SHALL show a free-text input for the full rule string
5. WHEN user submits the form THEN system SHALL validate the rule string is non-empty and has no unbalanced parentheses
6. WHEN rule is valid THEN system SHALL append it to the correct array in the in-memory parsed settings object
7. WHEN rule is added THEN system SHALL auto-save to the settings.json file immediately (no separate save button)
8. WHEN the `permissions` key does not yet exist in the file THEN system SHALL create it with the new rule

**Independent Test**: Click "+ Add Rule" in Allow → select Bash → type `npm run *` → submit → rule appears in Allow list → open settings.json manually → confirm rule is there.

---

### P1: Remove a permission rule [PERM-03] ⭐ MVP

**User Story**: As a Claude Code user, I want to remove a rule from any section by clicking a remove button, so I can clean up outdated or unwanted permissions.

**Why P1**: Add without remove is incomplete. Together they form the basic CRUD loop.

**Acceptance Criteria**:

1. WHEN user hovers a rule row THEN system SHALL show a remove (×) button on the right
2. WHEN user clicks remove THEN system SHALL remove the rule from the in-memory list and save to file immediately (no confirmation — undo via the add flow)
3. WHEN the last rule in a section is removed THEN system SHALL show "No rules" state again

**Independent Test**: Add a rule → remove it → rule disappears → file confirms removal.

---

### P1: Choose which settings file to edit [PERM-04] ⭐ MVP

**User Story**: As a Claude Code user, I want to choose whether I am editing the global settings or a workspace-specific settings file, so I can apply rules at the right scope.

**Why P1**: Without scope clarity, edits might go to the wrong file.

**Acceptance Criteria**:

1. WHEN the workspace detail drawer shows the settings section THEN system SHALL list all discovered settings files (e.g., `settings.json`, `settings.local.json`) with their scope label
2. WHEN user selects a file tab THEN the permissions editor SHALL load and edit that specific file
3. WHEN a file does not yet exist THEN system SHALL show "Create settings.json" button that creates it with `{}` and opens the editor
4. WHEN editing global workspace (id: `global`) THEN only `~/.claude/settings.json` SHALL be offered (not workspace variants)

**Independent Test**: Open global workspace → edit permissions → verify `~/.claude/settings.json` was written. Open a project workspace → see per-workspace settings file option.

---

### P2: Edit `defaultMode` from the settings panel [PERM-05]

**User Story**: As a Claude Code user, I want to change the `defaultMode` setting via a dropdown, so I can switch between `default`, `acceptEdits`, `plan`, `auto`, etc., without editing raw JSON.

**Acceptance Criteria**:

1. WHEN permissions section loads THEN system SHALL show a "Default Mode" field with a `<select>` populated with all valid modes and their short descriptions
2. WHEN user selects a mode THEN system SHALL update `permissions.defaultMode` in the file immediately
3. WHEN `defaultMode` is not set THEN selector SHALL show "default (unset)"

**Independent Test**: Change default mode to `acceptEdits` → re-read settings.json → `defaultMode: "acceptEdits"` present.

---

### P2: Edit `additionalDirectories` [PERM-06]

**User Story**: As a Claude Code user, I want to add extra directories that Claude Code is allowed to access (beyond the project root), using a folder picker, so I can grant access to shared libraries or config folders.

**Acceptance Criteria**:

1. WHEN permissions section loads THEN system SHALL show an "Additional Directories" sub-section listing current paths as chips
2. WHEN user clicks "+ Add Directory" THEN system SHALL open a folder picker dialog and add the chosen path to `permissions.additionalDirectories`
3. WHEN user removes a path THEN system SHALL remove it from the array and save

**Independent Test**: Add a directory → see it in the list → remove → gone from file.

---

### P2: Move a rule between Allow / Ask / Deny [PERM-07]

**User Story**: As a Claude Code user, I want to move an existing rule from one section to another (e.g., promote from Ask to Allow) without deleting and re-adding it.

**Acceptance Criteria**:

1. WHEN user hovers a rule THEN system SHALL show a move button (or dropdown: "Move to Allow / Ask / Deny")
2. WHEN user selects a target section THEN system SHALL remove the rule from the source array and append it to the target, then save

**Independent Test**: Add a rule to Ask → move it to Allow → verify it moved in the file.

---

### P3: Inline rule validation with hints [PERM-08]

**User Story**: As a Claude Code user, I want the add-rule form to show inline hints and warnings as I type, so I can catch syntax mistakes before saving.

**Acceptance Criteria**:

1. WHEN user types a Bash rule with unbalanced parentheses THEN system SHALL highlight the error and disable save
2. WHEN user types a path rule starting with `~` THEN system SHALL suggest adding `/` after `~` if missing
3. WHEN rule looks syntactically valid THEN system SHALL show a green check

**Independent Test**: Type `Bash(npm run ` (unclosed) → see error state → close it → error clears.

---

## Edge Cases

- WHEN `settings.json` is malformed JSON THEN system SHALL show a parse error with "Edit raw" fallback link (opens raw textarea)
- WHEN write to file fails (permissions error) THEN system SHALL show an error toast and revert in-memory state
- WHEN user adds a duplicate rule (same string already in that section) THEN system SHALL show "Rule already exists"
- WHEN `permissions` key exists but is not an object THEN system SHALL treat it as corrupted and offer to reset
- WHEN `deny` and `allow` both contain the same rule THEN system SHALL show a warning: "Deny overrides Allow — this Allow rule will never match"

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PERM-01 | P1: Structured permissions view | Design | Pending |
| PERM-02 | P1: Add rule with guided form | Design | Pending |
| PERM-03 | P1: Remove rule | Design | Pending |
| PERM-04 | P1: File scope selector | Design | Pending |
| PERM-05 | P2: Edit defaultMode | Design | Pending |
| PERM-06 | P2: additionalDirectories | Design | Pending |
| PERM-07 | P2: Move rule between sections | Design | Pending |
| PERM-08 | P3: Inline validation hints | Design | Pending |

---

## Success Criteria

- [ ] User can add a Bash allow rule without knowing the syntax by hand
- [ ] User can add a path-based Read rule using a folder picker
- [ ] All changes are written to the correct file with no manual save step
- [ ] Raw JSON fallback is always available for power users
- [ ] The editor correctly supports all official Claude Code tool namespaces
