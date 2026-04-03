# Agents Canvas — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  ELECTRON MAIN PROCESS (Node.js)                        │
│                                                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │  AgentReader     │  │  SurrealDB Store            │ │
│  │  - scan dirs     │  │  - ~/.agents-room/db        │ │
│  │  - parse matter  │  │  - workspace table          │ │
│  │  - detect rels   │  │  - agent_meta table         │ │
│  └────────┬─────────┘  └──────────────┬──────────────┘ │
│           └──────────────┬────────────┘                 │
│                    IPC Handlers                          │
│              (contextBridge + preload)                   │
└──────────────────────────┬──────────────────────────────┘
                           │ ipcRenderer
┌──────────────────────────▼──────────────────────────────┐
│  ELECTRON RENDERER (React + Vite)                       │
│                                                         │
│  App.tsx                                                │
│  ├── WorkspacePicker (shown on first launch)            │
│  └── AgentsRoom                                         │
│      ├── Toolbar (workspace name, change btn)           │
│      ├── AgentsCanvas                                   │
│      │   ├── SystemNode (Claude Code, top center)       │
│      │   ├── AgentCard[] (grid below)                   │
│      │   └── RelationshipLines (SVG overlay)            │
│      └── AgentDetailDrawer (slide-in panel)             │
└─────────────────────────────────────────────────────────┘
```

## Main Process: Key Modules

### `src/main/agents-reader.ts`

```ts
interface AgentFile {
  name: string
  description: string
  model: string | null
  tools: string[]
  frontmatter: Record<string, unknown>  // all parsed YAML fields
  body: string                          // markdown body after frontmatter
  filePath: string
  source: 'global' | 'workspace'
}

interface AgentWithRelations extends AgentFile {
  mentions: string[]   // agent names found in body text
  mentionedBy: string[] // agents that reference this one
}

// Scans dir, parses *.md files with gray-matter
async function readAgentsFromDir(dir: string, source: 'global' | 'workspace'): Promise<AgentFile[]>

// Detects heuristic relationships by scanning body text
function detectRelationships(agents: AgentFile[]): AgentWithRelations[]
```

**Relationship detection algorithm:**
1. Collect all agent `name` values into a Set
2. For each agent, scan `body` text for occurrences of other agent names
3. A name is "mentioned" if it appears as a whole word (word boundary match): `\bname\b`
4. Build `mentions[]` and `mentionedBy[]` arrays
5. Agents with empty `mentionedBy[]` are "roots" — connected directly from system node

### `src/main/surreal-store.ts`

```ts
// DB path: ~/.agents-room/db
// Tables:
//   workspace { id, path, lastOpened }
//   agent_meta { id, agentName, sourcePath, notes, tags, updatedAt }

async function initDB(): Promise<void>
async function getLastWorkspace(): Promise<string | null>
async function saveWorkspace(path: string): Promise<void>
async function getAgentMeta(agentName: string, sourcePath: string): Promise<AgentMeta | null>
async function saveAgentMeta(meta: AgentMeta): Promise<void>
```

### `src/main/ipc-handlers.ts`

```ts
// Channels:
//   agents:load(workspacePath) → AgentWithRelations[]
//   workspace:get-last() → string | null
//   workspace:save(path) → void
//   workspace:pick() → string | null  (opens folder dialog)
//   agent-meta:get(agentName, sourcePath) → AgentMeta | null
//   agent-meta:save(meta) → void
```

### `src/preload/index.ts`

Exposes `window.electronAPI` with typed wrappers for all IPC channels via `contextBridge`.

---

## Renderer: Component Design

### `AgentsCanvas`

Layout strategy:
- **System node:** fixed position, top center, non-card special node
- **Agent cards:** CSS Grid, `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, below system node
- **Relationship SVG:** absolute-positioned `<svg>` overlay, `pointer-events: none`, drawn over cards
- **Coordinates:** card positions measured with `getBoundingClientRect()` after mount

```
┌─────────────────────────────────┐
│        [Claude Code ★]          │  ← SystemNode
│         /    |    \             │
│   [MC]  [DA] [RA] [IN] [CB] [SY]│  ← AgentCards in grid
│           (relationship SVG)    │
└─────────────────────────────────┘
```

### `AgentCard`

Props: `agent: AgentWithRelations`, `onClick: () => void`, `isSelected: boolean`

Visual zones:
```
┌─────────────────────────────┐
│ [Global] [model badge]      │  ← badges row
│                             │
│ 🤖 agent-name               │  ← name (bold)
│                             │
│ Description preview...      │  ← 2 lines, truncated
│                             │
│ Tools: [tool1] [tool2] +N   │  ← tool badges
└─────────────────────────────┘
```

Tailwind tokens:
- Card bg: `bg-zinc-900 border border-zinc-700 rounded-xl`
- Selected: `ring-2 ring-indigo-500`
- Model badge: `bg-indigo-900/50 text-indigo-300 text-xs`
- Global badge: `bg-emerald-900/50 text-emerald-300 text-xs`
- Workspace badge: `bg-amber-900/50 text-amber-300 text-xs`

### `AgentDetailDrawer`

- Right-side slide-in panel, `w-[420px]`
- Sections: Header, Frontmatter table, Body (rendered markdown via `react-markdown`), SurrealDB Notes
- Escape key closes; backdrop click closes

### `SystemNode`

Special card at top:
- Larger, distinct style: `bg-gradient-to-br from-indigo-900 to-purple-900`
- Shows Claude Code logo + "Claude Code" label
- Not clickable (no detail drawer)

---

## SurrealDB: Schema

```sql
DEFINE TABLE workspace SCHEMAFULL;
DEFINE FIELD path ON workspace TYPE string;
DEFINE FIELD lastOpened ON workspace TYPE datetime;
DEFINE INDEX workspace_path ON workspace FIELDS path UNIQUE;

DEFINE TABLE agent_meta SCHEMAFULL;
DEFINE FIELD agentName ON agent_meta TYPE string;
DEFINE FIELD sourcePath ON agent_meta TYPE string;
DEFINE FIELD notes ON agent_meta TYPE string;
DEFINE FIELD tags ON agent_meta TYPE array;
DEFINE FIELD updatedAt ON agent_meta TYPE datetime;
DEFINE INDEX agent_meta_key ON agent_meta FIELDS agentName, sourcePath UNIQUE;
```

---

## File Structure

```
agent-room-ui/
├── .specs/                        # Spec docs (this dir)
├── src/
│   ├── main/
│   │   ├── index.ts               # Electron main entry
│   │   ├── agents-reader.ts       # FS scan + frontmatter + relations
│   │   ├── surreal-store.ts       # SurrealDB init + queries
│   │   └── ipc-handlers.ts        # IPC channel registration
│   ├── preload/
│   │   └── index.ts               # contextBridge API
│   └── renderer/
│       ├── index.html
│       ├── main.tsx               # React entry
│       ├── App.tsx                # Root: WorkspacePicker | AgentsRoom
│       ├── types/
│       │   └── agent.ts           # AgentFile, AgentWithRelations, AgentMeta
│       ├── hooks/
│       │   ├── useAgents.ts       # Load agents via IPC
│       │   └── useWorkspace.ts    # Workspace state + persistence
│       └── components/
│           ├── WorkspacePicker.tsx
│           ├── AgentsRoom.tsx     # Main layout shell
│           ├── AgentsCanvas.tsx   # Canvas + SVG lines
│           ├── SystemNode.tsx
│           ├── AgentCard.tsx
│           └── AgentDetailDrawer.tsx
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| SurrealDB binding | `surrealdb.js` with file engine | Pure JS, no native addon compilation needed |
| Relationship lines | SVG absolute overlay | No graph lib dependency; simpler for v1 |
| Markdown rendering | `react-markdown` | Lightweight, no bundled editor needed |
| Canvas layout | CSS Grid + SVG | Avoids heavy canvas/graph libs for v1 |
