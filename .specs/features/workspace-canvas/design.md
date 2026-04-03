# Workspace Canvas — Design

## Architecture Overview

```
App
├── WorkspaceSidebar (left, toggleable)
│   ├── WorkspaceListItem × N (name, emoji, tags, edit, remove)
│   └── AddWorkspaceButton
├── MainCanvas (react-zoom-pan-pinch)
│   └── WorkspaceGroupBox × N (draggable)
│       ├── GroupBoxHeader (drag handle, name, emoji, item count)
│       ├── AgentsSubgroup
│       │   └── AgentCard × N (max 4/row)
│       ├── SkillsSubgroup
│       │   └── SkillCard × N (max 4/row)
│       └── CommandsSubgroup (if present)
│           └── CommandCard × N (max 4/row)
├── AgentDetailDrawer (right, slide-in on card click)
├── TrashPanel (bottom drawer, toggle from toolbar)
└── Toolbar
    ├── SidebarToggle
    ├── WorkspaceLabel
    ├── ReloadButton
    └── TrashButton (badge with count)
```

## Data Model Changes

### store.json schema (extended)

```ts
interface StoreData {
  // v1 field — single workspace path — DEPRECATED
  workspaces: WorkspaceRecord[]
  agentMeta: Record<string, AgentMeta>
  // NEW:
  workspaceList: WorkspaceEntry[]     // replaces workspaces[]
  trashItems: TrashRecord[]
  canvasPositions: Record<string, CanvasPosition>  // key: workspace id
}

interface WorkspaceEntry {
  id: string           // uuid
  path: string         // '' = global
  name: string         // display name
  emoji: string        // default: '📁', global: '🌐'
  tags: string[]
  addedAt: string
}

interface CanvasPosition {
  x: number
  y: number
}

interface TrashRecord {
  id: string
  originalPath: string   // full path of original file/folder
  trashPath: string      // full path in .claude/.trash/
  itemName: string
  itemType: 'agent' | 'skill' | 'command'
  workspacePath: string  // which workspace it belonged to
  trashedAt: string
}
```

### Item types

```ts
interface AgentFile {
  // existing — unchanged
}

interface SkillItem {
  name: string
  description: string
  model: string | null
  disableModelInvocation: boolean
  folderPath: string    // ~/.claude/skills/name/
  source: 'global' | 'workspace'
}

interface CommandItem {
  name: string           // filename without .md
  description: string    // first line of .md content
  filePath: string
  source: 'global' | 'workspace'
}
```

## Visual Design

### Contrast improvements
Current issue: cards use `bg-zinc-900/80` with `text-zinc-400` — too low contrast on dark canvas.

Changes:
- Canvas bg: `#0a0a0f` (darker, more contrast with cards)
- Card bg: `bg-[#1a1a24]` solid (no transparency issues)
- Card border: `border-zinc-700/60` (brighter)
- Primary text: `text-zinc-100` (near-white)
- Secondary text: `text-zinc-400` → `text-zinc-300`
- Dot grid: `rgba(255,255,255,0.04)` (subtler)

### Group box aesthetics

```
┌─────────────────────────────────────────────────────┐
│ 🌐  Global  ·  12 items                        [≡] │  ← header (drag handle)
│─────────────────────────────────────────────────────│
│  ▸ Agents                                           │  ← subgroup label
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │agent1│ │agent2│ │agent3│ │agent4│              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│  ┌──────┐ ┌──────┐                                  │
│  │agent5│ │agent6│                                  │
│  └──────┘ └──────┘                                  │
│─────────────────────────────────────────────────────│
│  ▸ Skills                                           │  ← different section
│  ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │skill1│ │skill2│ │skill3│                        │
│  └──────┘ └──────┘ └──────┘                        │
└─────────────────────────────────────────────────────┘
```

**Group box:**
- Background: `bg-[#0f0f18]/95 border border-zinc-800/60`
- Header: `bg-zinc-900/80` with drag cursor
- Min-width: `960px`, padding: `20px`
- Border radius: `16px`
- Shadow: `shadow-2xl shadow-black/40`

**Agents subgroup:**
- Label: indigo accent `text-indigo-400`
- Cards: current style (slightly adjusted for contrast)
- Section bg: transparent

**Skills subgroup:**
- Label: emerald accent `text-emerald-400`
- Cards: `bg-[#131a1a]` (slight green tint), border `border-emerald-900/30`
- Skill icon: book/scroll icon instead of agent icon

**Commands subgroup:**
- Label: amber accent `text-amber-400`
- Cards: `bg-[#1a1710]` (slight amber tint), border `border-amber-900/30`
- Small "cmd" badge

### Context menu

Right-click on any card shows:
```
┌─────────────────────┐
│ Copy to workspace ▸ │ → submenu of workspaces
│ Duplicate           │
│ ─────────────────── │
│ Move to trash       │
└─────────────────────┘
```

If item is in trash:
```
┌──────────────────────┐
│ Restore              │
│ ──────────────────── │
│ Delete permanently   │  → confirmation modal
└──────────────────────┘
```

### Trash panel

Slides up from bottom when trash icon clicked:
- Header: "Trash · N items"
- List: item name, type badge, workspace, date trashed, [Restore] [Delete]
- Empty state: "Trash is empty"

## New / Modified Files

```
src/
├── main/
│   ├── agents-reader.ts         MODIFY — add readSkills(), readCommands()
│   ├── surreal-store.ts         MODIFY — new schema, workspaceList, trashItems, canvasPositions
│   ├── ipc-handlers.ts          MODIFY — new channels for workspace CRUD, trash, copy/duplicate
│   └── file-ops.ts              NEW    — copy, duplicate, trash, restore, delete operations
├── renderer/src/
│   ├── types/
│   │   └── agent.ts             MODIFY — add SkillItem, CommandItem, WorkspaceEntry, TrashRecord
│   ├── hooks/
│   │   ├── useWorkspaces.ts     NEW    — replaces useWorkspace (plural, multi-workspace)
│   │   └── useTrash.ts          NEW    — trash panel state
│   └── components/
│       ├── WorkspaceSidebar.tsx NEW
│       ├── WorkspaceGroupBox.tsx NEW   — draggable group box
│       ├── AgentsSubgroup.tsx   NEW
│       ├── SkillsSubgroup.tsx   NEW
│       ├── SkillCard.tsx        NEW
│       ├── CommandCard.tsx      NEW
│       ├── CardContextMenu.tsx  NEW    — right-click menu
│       ├── TrashPanel.tsx       NEW
│       ├── AgentsCanvas.tsx     MODIFY — group boxes instead of flat grid
│       ├── AgentCard.tsx        MODIFY — contrast adjustments
│       └── AgentsRoom.tsx       MODIFY — sidebar + trash panel wiring
```

## IPC Channels (new)

```
workspaces:list              → WorkspaceEntry[]
workspaces:add(path)         → WorkspaceEntry
workspaces:remove(id)        → void
workspaces:update-meta(id, meta) → WorkspaceEntry
workspaces:load-items(path)  → { agents, skills, commands }
canvas:get-position(id)      → CanvasPosition | null
canvas:set-position(id, pos) → void
items:copy(srcPath, targetWorkspacePath, type) → void
items:duplicate(srcPath, type) → void
items:trash(srcPath, workspacePath, type) → TrashRecord
trash:list                   → TrashRecord[]
trash:restore(trashId)       → void
trash:delete(trashId)        → void
```
