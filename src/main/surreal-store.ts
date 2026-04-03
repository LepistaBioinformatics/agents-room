/**
 * Local storage for Agents Room — JSON file at ~/.agents-room/store.json
 *
 * Paths are stored relative to the user's home directory using the `~/` prefix
 * so the config is portable across machines (update homeDir when migrating).
 */
import { homedir } from 'os'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface WorkspaceEntry {
  id: string
  path: string        // '' = global
  name: string
  emoji: string
  tags: string[]
  displayName?: string
  avatarPath?: string
  addedAt: string
}

export interface CanvasPosition {
  x: number
  y: number
}

export interface AgentMeta {
  agentName: string
  sourcePath: string
  notes: string
  tags: string[]
  avatarPath?: string
  updatedAt: string
}

export interface TrashRecord {
  id: string
  originalPath: string
  trashPath: string
  itemName: string
  itemType: 'agent' | 'skill' | 'command'
  workspacePath: string
  trashedAt: string
}

interface StoreData {
  homeDir: string
  workspaceList: WorkspaceEntry[]
  agentMeta: Record<string, AgentMeta>
  trashItems: TrashRecord[]
  canvasPositions: Record<string, CanvasPosition>
}

const AGENTS_ROOM_DIR = join(homedir(), '.agents-room')
const STORE_PATH = join(AGENTS_ROOM_DIR, 'store.json')

const GLOBAL_ENTRY: WorkspaceEntry = {
  id: 'global',
  path: '',
  name: 'Global',
  emoji: '🌐',
  tags: [],
  addedAt: new Date().toISOString()
}

// ── Path normalization ────────────────────────────────────────────────────────

const HOME = homedir()

/** Convert absolute path to ~/... if it's under the home directory. */
function rel(path: string): string {
  if (!path) return path
  if (path.startsWith(HOME + '/')) return '~/' + path.slice(HOME.length + 1)
  return path
}

/** Resolve ~/... back to an absolute path. */
function abs(path: string): string {
  if (!path) return path
  if (path.startsWith('~/')) return HOME + '/' + path.slice(2)
  return path
}

function packWorkspace(e: WorkspaceEntry): WorkspaceEntry {
  return { ...e, path: rel(e.path), avatarPath: e.avatarPath ? rel(e.avatarPath) : undefined }
}

function unpackWorkspace(e: WorkspaceEntry): WorkspaceEntry {
  return { ...e, path: abs(e.path), avatarPath: e.avatarPath ? abs(e.avatarPath) : undefined }
}

function packMeta(m: AgentMeta): AgentMeta {
  return { ...m, sourcePath: rel(m.sourcePath), avatarPath: m.avatarPath ? rel(m.avatarPath) : undefined }
}

function unpackMeta(m: AgentMeta): AgentMeta {
  return { ...m, sourcePath: abs(m.sourcePath), avatarPath: m.avatarPath ? abs(m.avatarPath) : undefined }
}

function packTrash(t: TrashRecord): TrashRecord {
  return { ...t, originalPath: rel(t.originalPath), trashPath: rel(t.trashPath), workspacePath: rel(t.workspacePath) }
}

function unpackTrash(t: TrashRecord): TrashRecord {
  return { ...t, originalPath: abs(t.originalPath), trashPath: abs(t.trashPath), workspacePath: abs(t.workspacePath) }
}

// ── Store I/O ─────────────────────────────────────────────────────────────────

function readStore(): StoreData {
  try {
    const raw = readFileSync(STORE_PATH, 'utf-8')
    const data = JSON.parse(raw) as Partial<StoreData>
    return {
      homeDir: data.homeDir ?? HOME,
      workspaceList: data.workspaceList ?? [GLOBAL_ENTRY],
      agentMeta: data.agentMeta ?? {},
      trashItems: data.trashItems ?? [],
      canvasPositions: data.canvasPositions ?? {}
    }
  } catch {
    return {
      homeDir: HOME,
      workspaceList: [GLOBAL_ENTRY],
      agentMeta: {},
      trashItems: [],
      canvasPositions: {}
    }
  }
}

function writeStore(data: StoreData): void {
  data.homeDir = HOME
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function initDB(): Promise<void> {
  if (!existsSync(AGENTS_ROOM_DIR)) {
    mkdirSync(AGENTS_ROOM_DIR, { recursive: true })
  }
  if (!existsSync(STORE_PATH)) {
    writeStore({
      homeDir: HOME,
      workspaceList: [GLOBAL_ENTRY],
      agentMeta: {},
      trashItems: [],
      canvasPositions: {}
    })
  }
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export function listWorkspaces(): WorkspaceEntry[] {
  const data = readStore()
  const hasGlobal = data.workspaceList.some((w) => w.id === 'global')
  if (!hasGlobal) data.workspaceList.unshift(GLOBAL_ENTRY)
  return data.workspaceList.map(unpackWorkspace)
}

export function addWorkspace(path: string): WorkspaceEntry {
  const data = readStore()
  const existing = data.workspaceList.find((w) => abs(w.path) === path)
  if (existing) return unpackWorkspace(existing)

  const parts = path.split('/')
  const name = parts[parts.length - 1] || path
  const entry: WorkspaceEntry = {
    id: randomUUID(),
    path,
    name,
    emoji: '📁',
    tags: [],
    addedAt: new Date().toISOString()
  }
  data.workspaceList.push(packWorkspace(entry))
  writeStore(data)
  return entry
}

export function removeWorkspace(id: string): void {
  if (id === 'global') return
  const data = readStore()
  data.workspaceList = data.workspaceList.filter((w) => w.id !== id)
  delete data.canvasPositions[id]
  writeStore(data)
}

export function updateWorkspaceMeta(
  id: string,
  meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>
): WorkspaceEntry | null {
  const data = readStore()
  const entry = data.workspaceList.find((w) => w.id === id)
  if (!entry) return null
  if (meta.name !== undefined) entry.name = meta.name
  if (meta.emoji !== undefined) entry.emoji = meta.emoji
  if (meta.tags !== undefined) entry.tags = meta.tags
  if (meta.displayName !== undefined) entry.displayName = meta.displayName
  if (meta.avatarPath !== undefined) entry.avatarPath = rel(meta.avatarPath)
  writeStore(data)
  return unpackWorkspace(entry)
}

// ── Canvas positions ──────────────────────────────────────────────────────────

export function getCanvasPosition(id: string): CanvasPosition | null {
  return readStore().canvasPositions[id] ?? null
}

export function setCanvasPosition(id: string, pos: CanvasPosition): void {
  const data = readStore()
  data.canvasPositions[id] = pos
  writeStore(data)
}

// ── Agent metadata ────────────────────────────────────────────────────────────

function metaKey(agentName: string, sourcePath: string): string {
  return `${agentName}::${rel(sourcePath)}`
}

export async function getAgentMeta(
  agentName: string,
  sourcePath: string
): Promise<AgentMeta | null> {
  const data = readStore()
  const stored = data.agentMeta[metaKey(agentName, sourcePath)]
    ?? data.agentMeta[`${agentName}::${sourcePath}`]  // backward-compat with old absolute keys
  return stored ? unpackMeta(stored) : null
}

export async function saveAgentMeta(meta: AgentMeta): Promise<void> {
  const key = metaKey(meta.agentName, meta.sourcePath)
  const data = readStore()
  data.agentMeta[key] = { ...packMeta(meta), updatedAt: new Date().toISOString() }
  writeStore(data)
}

export async function getAllAgentMeta(): Promise<AgentMeta[]> {
  return Object.values(readStore().agentMeta).map(unpackMeta)
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export function addTrashRecord(record: Omit<TrashRecord, 'id' | 'trashedAt'>): TrashRecord {
  const data = readStore()
  const full: TrashRecord = {
    ...record,
    id: randomUUID(),
    trashedAt: new Date().toISOString()
  }
  data.trashItems.push(packTrash(full))
  writeStore(data)
  return full
}

export function listTrashItems(): TrashRecord[] {
  return readStore().trashItems.map(unpackTrash)
}

export function removeTrashRecord(id: string): void {
  const data = readStore()
  data.trashItems = data.trashItems.filter((t) => t.id !== id)
  writeStore(data)
}

export function getTrashRecord(id: string): TrashRecord | null {
  const stored = readStore().trashItems.find((t) => t.id === id)
  return stored ? unpackTrash(stored) : null
}
