# Roadmap

## v1 — MVP Canvas (current)

**Goal:** See your agent team. Understand relationships. Annotate without touching files.

| Feature | Status | Notes |
|---|---|---|
| Agent reader (FS + frontmatter) | ✅ Done | `agents-reader.ts` — gray-matter, global + workspace |
| Workspace selection (folder picker) | ✅ Done | Sidebar with Add button → dialog.showOpenDialog |
| Multi-workspace canvas (group boxes) | ✅ Done | Each workspace = draggable box; positions saved |
| Agents / Skills / Commands subgroups | ✅ Done | 4-per-row grid; distinct color aesthetics per type |
| Skills reader | ✅ Done | Folder-based: `~/.claude/skills/<name>/SKILL.md` |
| Commands reader | ✅ Done | `~/.claude/commands/*.md` → slash command cards |
| Pan/zoom canvas | ✅ Done | `react-zoom-pan-pinch`; dot grid background; zoom controls |
| Relationship detection (heuristic) | ✅ Done | Body scan for agent name mentions |
| Agent detail drawer | ✅ Done | Tools, relationships, frontmatter, prompt body, notes |
| Context menu (copy/duplicate/trash) | ✅ Done | Portal-rendered; position-accurate at all zoom levels |
| Logical trash (move/restore/delete) | ✅ Done | `.claude/.trash/`; restore with missing-dir warning |
| Workspace metadata (name, emoji, tags) | ✅ Done | All editable in WorkspaceDetailDrawer; persisted in store.json |
| Display name for workspaces | ✅ Done | Custom label overrides folder name in header |
| Tags on agents | ✅ Done | Editable in detail drawer; shown on card |
| Avatars (workspaces + agents) | ✅ Done | File picker → copy to `~/.agents-room/avatars/`; served via IPC data URL |
| Inter font + font size | ✅ Done | `@fontsource/inter`; 15px base |
| Canvas initial positioning | ✅ Done | Auto-pan to boxes on first load; ⊙ centers on content |
| Drag accuracy at all zoom levels | ✅ Done | Delta / scale via `useTransformContext` |
| Hover-to-open detail button | ✅ Done | Replaces direct click; avoids panning conflict |
| CVA + system theme | ✅ Done | `class-variance-authority` + CSS tokens + `darkMode: 'media'`; `ag-*` namespace |
| Skill detail drawer | ✅ Done | Badges, metadata table, SKILL.md body rendered as Markdown |
| Workspace detail drawer | ✅ Done | Editable name/emoji/avatar/tags + CLAUDE.md editor + settings read-only view + delete confirmation |
| Snap-to-grid drag | ✅ Done | Group box drag snaps to 32px grid |
| Portable store paths | ✅ Done | Paths stored as `~/…`; resolved to absolute at API boundary; backward compat |

## v2 — Enrichment

| Feature | Status | Notes |
|---|---|---|
| **Skills install API** | ✅ Done | Browse trusted sources or paste any GitHub URL; 3-tier trust model (Trusted/Known/Unknown); downloads to `~/.claude/skills/<name>/`; origin badge + provenance in detail drawer; installed-state detection; uninstall from drawer. |
| **Brand guide** | ✅ Done | Honey Bronze accent, neutral color system, JetBrains Mono, character card layout, group header redesign, `docs/brand/` reference. |
| **Command detail view** | ✅ Done | Drawer with full .md content; body in CommandItem; wired via canvas |
| **Tag filtering on canvas** | ✅ Done | Filter bar in sidebar; logic D (workspace OR agent tags); multi-select OR |
| **Search global** | ✅ Done | Modal (Ctrl+K); agents/skills/commands; pan-to + card flash; keyboard nav |
| Skill / command creation from UI | Planned | Create / edit SKILL.md or command .md |
| **Trusted Sources Registry** | ✅ Done | Sources tab in Browse panel; userSources in store.json; sources:add/remove/update IPC; user-trusted tier (blue badge). |
| **Permissions Editor** | ✅ Done | PermissionsEditor in workspace drawer; Allow/Ask/Deny editor; tool picker; defaultMode; additionalDirs; raw fallback. PERM-07/08 deferred. |
| Migrate store to @surrealdb/node | Planned | Richer queries; requires electron-rebuild setup |

## v3 — Intelligence

| Feature | Status | Notes |
|---|---|---|
| Manual relationship overrides | Planned | Drag to link agents |
| Agent dependency graph (DAG) | Planned | Dedicated DAG view |
| "What agents use tool X?" queries | Planned | Needs @surrealdb/node |
| CLAUDE.md / hooks / MCP visualization | Planned | Needs in-app editor |
