# Agents Room UI

**Vision:** A native, installable Electron app that gives Claude Code users a visual map of their agent teams — reading agent files from disk and rendering them as interactive cards on a canvas.

**For:** Developers who use Claude Code with custom sub-agents and want to understand, document, and manage their agent ecosystem visually.

**Solves:** There is no visual way to browse, understand relationships between, or annotate Claude Code agents. Users who build multi-agent systems (e.g., a council with orchestrator + specialists) have no map of what they've built.

## Goals

- Users can see all their agents (global + workspace) rendered as cards on a canvas in under 3 seconds of app launch
- Users can add metadata to agents (notes, tags, status) that persists in SurrealDB without touching agent `.md` files
- The canvas clearly communicates hierarchy: Claude Code system node at top, agents below, detected relationships visualized

## Tech Stack

**Core:**
- Framework: Electron 28+
- Language: TypeScript 5+
- Renderer: React 18 + Vite (via electron-vite)
- Styling: Tailwind CSS 3
- Database: SurrealDB (embedded, file-based at `~/.agents-room/`)

**Key dependencies:**
- `electron-vite` — build tooling for Electron + Vite
- `gray-matter` — YAML frontmatter parsing for `.md` agent files
- `surrealdb` — embedded local database for extra agent metadata
- `electron-builder` — packaging for distribution
- `lucide-react` — icons

## Scope

**v1 includes:**
- Read agents from `~/.claude/agents/` (always, global)
- Read agents from `<workspace>/.claude/agents/` (workspace-scoped)
- Workspace selection: CLI arg (`agents-room /path/to/project`) or folder picker on launch
- Canvas view: Claude Code system node on top, all agents as cards below
- Heuristic relationship detection: scan agent body for mentions of other agent names
- Agent card: name, model, description, tools, all frontmatter fields
- Agent detail panel (side drawer): full body, raw frontmatter, SurrealDB extra fields
- SurrealDB at `~/.agents-room/`: stores notes, tags, custom fields per agent
- `.agents-room/` data is portable (can be backed up / moved between machines)

**Explicitly out of scope (v1):**
- Editing agent `.md` files from within the UI
- Creating new agents from the UI
- Real-time agent execution or chat interface
- Cloud sync
- Windows/macOS builds (Linux primary target, others TBD)

## Constraints

- Technical: SurrealDB must run embedded (no server process) to avoid daemon management
- Technical: App must work fully offline — no external network calls
- UX: Workspace selection must mirror VSCode mental model (CLI arg or folder picker)
