# Agents Canvas — Tasks

## Status Legend
`[ ]` pending · `[→]` in_progress · `[✓]` completed · `[!]` blocked

---

## T01 — Scaffold project with electron-vite
**Status:** [ ]  
**What:** Initialize the project using `electron-vite` template (React + TypeScript), install all deps, configure Tailwind CSS.  
**Where:** `/` (project root)  
**Depends on:** —  
**Done when:**
- `yarn dev` launches Electron with a blank React app
- Tailwind classes render correctly
- TypeScript compiles without errors

**Gate:** `yarn dev` exits cleanly; Tailwind utility class applies to a test div

---

## T02 — Define shared types
**Status:** [ ]  
**What:** Write `src/renderer/types/agent.ts` with `AgentFile`, `AgentWithRelations`, `AgentMeta`, `Workspace` interfaces. Write `src/preload/types.ts` with the `ElectronAPI` interface (IPC channel signatures).  
**Where:** `src/renderer/types/agent.ts`, `src/preload/types.ts`  
**Depends on:** T01  
**Done when:** Types exported and importable; no circular deps

**Gate:** `tsc --noEmit` passes

---

## T03 — Implement AgentReader (main process)
**Status:** [ ]  
**What:** `src/main/agents-reader.ts` — scan dir for `*.md`, parse with `gray-matter`, extract `name/description/model/tools/frontmatter/body`, detect relationships via word-boundary body scan.  
**Where:** `src/main/agents-reader.ts`  
**Depends on:** T02  
**Done when:**
- Reads `~/.claude/agents/` correctly
- Returns all 6 council agents with correct frontmatter
- `council-mc` has `mentions` array containing the 5 sub-agent names

**Gate:** Manual test: `console.log(await readAgentsFromDir(...))` in main logs correct data

---

## T04 — Implement SurrealDB store (main process)
**Status:** [ ]  
**What:** `src/main/surreal-store.ts` — init SurrealDB at `~/.agents-room/db`, define schema, implement CRUD for `workspace` and `agent_meta` tables.  
**Where:** `src/main/surreal-store.ts`  
**Depends on:** T02  
**Done when:**
- DB initializes on first launch, creates `~/.agents-room/` dir
- `saveWorkspace` + `getLastWorkspace` round-trip works
- `saveAgentMeta` + `getAgentMeta` round-trip works

**Gate:** Manual test: save + retrieve workspace path; save + retrieve agent notes

---

## T05 — Implement IPC handlers + preload bridge
**Status:** [ ]  
**What:** `src/main/ipc-handlers.ts` registers all IPC channels. `src/preload/index.ts` exposes `window.electronAPI` via `contextBridge`.  
**Where:** `src/main/ipc-handlers.ts`, `src/preload/index.ts`  
**Depends on:** T03, T04  
**Done when:** All channels in design.md are registered and callable from renderer

**Gate:** `ipcRenderer.invoke('agents:load', path)` returns agents array in renderer console

---

## T06 — Build WorkspacePicker component [CANVAS-01, CANVAS-04]
**Status:** [ ]  
**What:** `src/renderer/components/WorkspacePicker.tsx` — shown on first launch (no persisted workspace). Has a "Select folder" button (calls `workspace:pick()` IPC) and auto-loads persisted workspace on mount.  
**Where:** `src/renderer/components/WorkspacePicker.tsx`, `src/renderer/hooks/useWorkspace.ts`  
**Depends on:** T05  
**Done when:**
- On launch with no stored workspace → picker screen shown
- User clicks "Select folder" → OS folder dialog opens → path saved → agents load
- On launch with stored workspace → picker skipped, agents load directly
- "Change workspace" button accessible from main UI

**Gate:** Close app → reopen → workspace loads without picker

---

## T07 — Build AgentCard component [CANVAS-01, CANVAS-06]
**Status:** [ ]  
**What:** `src/renderer/components/AgentCard.tsx` — card UI per design.md spec. Shows name, model badge, description preview, tools badges, source badge (Global/Workspace).  
**Where:** `src/renderer/components/AgentCard.tsx`  
**Depends on:** T02  
**Done when:** Card renders all required fields; selected state shows indigo ring

**Gate:** Storybook or visual check in dev mode with mock data

---

## T08 — Build SystemNode component
**Status:** [ ]  
**What:** `src/renderer/components/SystemNode.tsx` — special top-center node, gradient style, "Claude Code" label.  
**Where:** `src/renderer/components/SystemNode.tsx`  
**Depends on:** T02  
**Done when:** Renders at top center of canvas with correct styling

**Gate:** Visual check in dev mode

---

## T09 — Build AgentsCanvas with relationship SVG [CANVAS-01, CANVAS-03]
**Status:** [ ]  
**What:** `src/renderer/components/AgentsCanvas.tsx` — CSS Grid layout with SystemNode top-center, AgentCards in grid below, SVG overlay for relationship lines. Lines drawn using `getBoundingClientRect` after mount.  
**Where:** `src/renderer/components/AgentsCanvas.tsx`  
**Depends on:** T07, T08  
**Done when:**
- All agents rendered in grid
- Lines from SystemNode to root agents (agents with no `mentionedBy`)
- Lines from orchestrator agents to their mentioned sub-agents
- Lines are dashed, low opacity, non-blocking

**Gate:** With council agents loaded — `council-mc` has 5 outgoing lines; sub-agents have no direct SystemNode line

---

## T10 — Build AgentDetailDrawer [CANVAS-02, CANVAS-05]
**Status:** [ ]  
**What:** `src/renderer/components/AgentDetailDrawer.tsx` — right-side slide-in panel. Shows all metadata, rendered markdown body, SurrealDB notes textarea.  
**Where:** `src/renderer/components/AgentDetailDrawer.tsx`  
**Depends on:** T05, T07  
**Done when:**
- Opens on card click, closes on Escape/backdrop
- All frontmatter fields visible
- Body rendered as readable markdown
- Notes save to SurrealDB and persist across restarts

**Gate:** Click card → see all fields including raw frontmatter; add note → reopen → note visible

---

## T11 — Wire App.tsx and AgentsRoom [CANVAS-01]
**Status:** [ ]  
**What:** `src/renderer/App.tsx` — root component: show `WorkspacePicker` or `AgentsRoom` based on workspace state. `AgentsRoom.tsx` — layout shell with Toolbar + Canvas + Drawer.  
**Where:** `src/renderer/App.tsx`, `src/renderer/components/AgentsRoom.tsx`  
**Depends on:** T06, T09, T10  
**Done when:** Full app flow works end-to-end: launch → pick workspace → see canvas → click card → see details → restart → same workspace

**Gate:** Full end-to-end flow with council agents

---

## T12 — electron-builder config
**Status:** [ ]  
**What:** `electron-builder.yml` — configure Linux AppImage + deb targets. Add `build` script to `package.json`.  
**Where:** `electron-builder.yml`, `package.json`  
**Depends on:** T11  
**Done when:** `yarn build` produces distributable in `dist/`

**Gate:** `dist/*.AppImage` file exists and is runnable

---

## Dependency Graph

```
T01 → T02 → T03 → T05 → T06 → T11
                ↗         ↗
           T04 → T05   T09 ↗
                       ↑
           T02 → T07 → T09
                 ↗ T08 ↗
           T02 → T10 → T11
T11 → T12
```

## Parallel execution plan

- T03 and T04 can run in parallel (both depend only on T02)
- T07 and T08 can run in parallel (both depend only on T02)
- T06, T09, T10 can start once T05 and their component deps are done
