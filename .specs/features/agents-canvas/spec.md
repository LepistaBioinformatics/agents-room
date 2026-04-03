# Agents Canvas — Feature Specification

## Problem Statement

Claude Code users build teams of agents stored as `.md` files. There is no visual tool to browse them, understand their roles and relationships, or annotate them with context that lives outside the files themselves. This feature is the core of Agents Room: a canvas where your agent team becomes visible.

## Goals

- [ ] Render all agents (global + workspace) as interactive cards on a canvas within 3s of launch
- [ ] Visually communicate hierarchy and relationships between agents
- [ ] Allow annotation of agents via SurrealDB without modifying `.md` files

## Out of Scope

| Feature | Reason |
|---|---|
| Editing agent .md files | v2+ — avoids accidental corruption in v1 |
| Creating new agents | v2+ |
| Real-time execution / chat | Different product surface |
| Drag-to-reorder cards permanently | v2+ — focus on reading in v1 |

---

## User Stories

### P1: Launch app and see all agents [CANVAS-01] ⭐ MVP

**User Story:** As a Claude Code user, I want to open Agents Room and immediately see all my agents as cards on a canvas, so I can get a quick overview of my agent team.

**Why P1:** This is the entire value proposition. Nothing else works without it.

**Acceptance Criteria:**

1. WHEN app launches with no CLI arg THEN system SHALL display a workspace folder picker dialog
2. WHEN app launches with a path arg (`agents-room /path`) THEN system SHALL use that path as workspace root, skip picker
3. WHEN workspace is set THEN system SHALL read `~/.claude/agents/*.md` (global) AND `<workspace>/.claude/agents/*.md` (workspace)
4. WHEN agent files are loaded THEN system SHALL display a canvas with a "Claude Code" system node at the top center
5. WHEN agents are rendered THEN system SHALL display each agent as a card below the system node
6. WHEN an agent card is rendered THEN system SHALL show: agent name, model badge, first 120 chars of description, tools count
7. WHEN no `.md` files exist in a directory THEN system SHALL silently skip that directory (no error)

**Independent Test:** Launch app → see cards for all agents in `~/.claude/agents/`

---

### P1: View agent details [CANVAS-02] ⭐ MVP

**User Story:** As a user, I want to click an agent card and see its full details in a side panel, so I understand exactly what the agent does and how it's configured.

**Why P1:** Cards show a summary; the detail panel is where the real value lives.

**Acceptance Criteria:**

1. WHEN user clicks an agent card THEN system SHALL open a right-side detail drawer
2. WHEN detail drawer is open THEN system SHALL display: full name, model, all frontmatter fields, full description body
3. WHEN detail drawer is open THEN system SHALL display tools as a badge list
4. WHEN detail drawer is open THEN system SHALL display the raw markdown body in a readable format (not raw syntax)
5. WHEN user presses Escape or clicks outside THEN system SHALL close the drawer

**Independent Test:** Click any card → drawer opens with all agent metadata visible

---

### P1: Heuristic relationship visualization [CANVAS-03] ⭐ MVP

**User Story:** As a user, I want to see visual connections between agents that reference each other, so I can understand orchestration patterns without reading every file.

**Why P1:** The canvas without relationships is just a list with worse UX. Relationships are the core insight.

**Acceptance Criteria:**

1. WHEN agents are loaded THEN system SHALL scan each agent's body text for mentions of other loaded agent names
2. WHEN agent A's body mentions agent B's name THEN system SHALL draw a directed line from A → B on the canvas
3. WHEN the "Claude Code" system node is rendered THEN system SHALL draw lines from it to all agents that have no detected parent (i.e., are not mentioned by any other agent)
4. WHEN an agent IS mentioned by another agent THEN system SHALL NOT draw a direct line from the system node to it
5. WHEN relationship lines are rendered THEN system SHALL use a subtle, non-intrusive visual style (e.g., dashed line, low opacity)

**Independent Test:** With council agents loaded, `council-mc` should have lines to its sub-agents; sub-agents should NOT connect directly to the system node

---

### P1: Workspace persistence [CANVAS-04] ⭐ MVP

**User Story:** As a user, I want the app to remember the last workspace I used, so I don't have to pick the folder every time I open the app.

**Why P1:** Without this, the folder picker on every launch is unusable.

**Acceptance Criteria:**

1. WHEN a workspace is selected (via picker or CLI) THEN system SHALL persist its path in SurrealDB
2. WHEN app launches with no CLI arg AND a persisted workspace exists THEN system SHALL load that workspace automatically, skip picker
3. WHEN user wants to change workspace THEN system SHALL provide a "Change workspace" button in the UI

**Independent Test:** Select workspace → close app → reopen → workspace loads automatically

---

### P2: Agent annotations via SurrealDB [CANVAS-05]

**User Story:** As a user, I want to add notes and tags to agents that are stored separately from the `.md` files, so I can annotate my team without modifying the agent definitions.

**Why P2:** Core differentiator but not needed for first meaningful use.

**Acceptance Criteria:**

1. WHEN detail drawer is open THEN system SHALL show a "Notes" text area below the agent metadata
2. WHEN user types in Notes and saves THEN system SHALL persist the note in SurrealDB keyed by agent name + source path
3. WHEN app loads agents THEN system SHALL merge SurrealDB annotations into the agent data
4. WHEN user closes and reopens app THEN system SHALL restore notes from SurrealDB

**Independent Test:** Add a note to an agent → close app → reopen → note is still visible

---

### P2: Source badge (global vs workspace) [CANVAS-06]

**User Story:** As a user, I want to know at a glance whether an agent is global (from `~/.claude/agents`) or workspace-specific, so I understand its scope.

**Why P2:** Useful for multi-project users but not blocking MVP.

**Acceptance Criteria:**

1. WHEN an agent card is rendered THEN system SHALL display a "Global" or "Workspace" badge
2. WHEN agents from both sources have the same name THEN system SHALL display both, visually differentiated

**Independent Test:** With both global and workspace agents loaded, badges are visible and correct

---

## Edge Cases

- WHEN agent frontmatter is malformed YAML THEN system SHALL display the card with available fields and show a "Parse warning" indicator
- WHEN agent directory does not exist THEN system SHALL silently skip it (no crash)
- WHEN workspace has no `.claude/agents/` directory THEN system SHALL only show global agents
- WHEN there are 0 global agents AND 0 workspace agents THEN system SHALL show an empty state with instructions
- WHEN agent body is very long (>10k chars) THEN system SHALL truncate in the card, show full in detail panel

---

## Requirement Traceability

| Requirement ID | Story | Status |
|---|---|---|
| CANVAS-01 | P1: Launch + see agents | Pending |
| CANVAS-02 | P1: Agent detail panel | Pending |
| CANVAS-03 | P1: Relationship visualization | Pending |
| CANVAS-04 | P1: Workspace persistence | Pending |
| CANVAS-05 | P2: Agent annotations | Pending |
| CANVAS-06 | P2: Source badge | Pending |

---

## Success Criteria

- [ ] All 6 agents in `~/.claude/agents/` appear as cards within 3s of launch
- [ ] Clicking a card shows full metadata without missing any frontmatter field
- [ ] `council-mc` shows relationship lines to the 5 specialist sub-agents
- [ ] Workspace path persists across app restarts
