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
import { safeStorage } from 'electron'

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
  cardBackground?: string
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

export interface SkillMeta {
  skillName: string
  sourceUrl: string
  sourceOwner: string
  sourceRepo: string
  sourcePath: string
  sourceBranch: string
  trustTier: 'trusted' | 'user-trusted' | 'known' | 'unknown'
  installedAt: string
}

export interface UserSource {
  id: string
  name: string
  description: string
  owner: string
  repo: string
  path: string     // subdirectory within repo where skills live; '' = repo root
  branch: string
  url: string
  addedAt: string
}

export interface AppSettings {
  geminiApiKey?: string
  anthropicApiKey?: string
}

interface StoreData {
  homeDir: string
  workspaceList: WorkspaceEntry[]
  agentMeta: Record<string, AgentMeta>
  trashItems: TrashRecord[]
  canvasPositions: Record<string, CanvasPosition>
  skillMeta: Record<string, SkillMeta>
  userSources: UserSource[]
  githubToken?: string
}

const AGENTS_ROOM_DIR = join(homedir(), '.agents-room')
const STORE_PATH = join(AGENTS_ROOM_DIR, 'store.json')
const SETTINGS_PATH = join(AGENTS_ROOM_DIR, 'settings.json')

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

/** Convert absolute path to ~/... if it's under the home directory.
 *  Stored paths always use forward slashes for portability across platforms. */
function rel(path: string): string {
  if (!path) return path
  // Normalize to forward slashes so comparison works on Windows (sep = '\')
  const normalized = path.replace(/\\/g, '/')
  const homeNormalized = HOME.replace(/\\/g, '/')
  if (normalized.startsWith(homeNormalized + '/')) {
    return '~/' + normalized.slice(homeNormalized.length + 1)
  }
  return path
}

/** Resolve ~/... back to an absolute path using the platform's separator. */
function abs(path: string): string {
  if (!path) return path
  if (path.startsWith('~/')) return join(HOME, path.slice(2))
  return path
}

function packWorkspace(e: WorkspaceEntry): WorkspaceEntry {
  return { ...e, path: rel(e.path), avatarPath: e.avatarPath ? rel(e.avatarPath) : undefined }
}

function unpackWorkspace(e: WorkspaceEntry): WorkspaceEntry {
  return { ...e, path: abs(e.path), avatarPath: e.avatarPath ? abs(e.avatarPath) : undefined }
}

function packMeta(m: AgentMeta): AgentMeta {
  return {
    ...m,
    sourcePath: rel(m.sourcePath),
    avatarPath: m.avatarPath ? rel(m.avatarPath) : undefined,
    cardBackground: m.cardBackground ? rel(m.cardBackground) : undefined
  }
}

function unpackMeta(m: AgentMeta): AgentMeta {
  return {
    ...m,
    sourcePath: abs(m.sourcePath),
    avatarPath: m.avatarPath ? abs(m.avatarPath) : undefined,
    cardBackground: m.cardBackground ? abs(m.cardBackground) : undefined
  }
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
      canvasPositions: data.canvasPositions ?? {},
      skillMeta: data.skillMeta ?? {},
      userSources: data.userSources ?? []
    }
  } catch {
    return {
      homeDir: HOME,
      workspaceList: [GLOBAL_ENTRY],
      agentMeta: {},
      trashItems: [],
      canvasPositions: {},
      skillMeta: {},
      userSources: []
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
      canvasPositions: {},
      skillMeta: {},
      userSources: []
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

// ── Skill metadata ────────────────────────────────────────────────────────────

export function getSkillMeta(skillName: string): SkillMeta | null {
  return readStore().skillMeta[skillName] ?? null
}

export function saveSkillMeta(meta: SkillMeta): void {
  const data = readStore()
  data.skillMeta[meta.skillName] = meta
  writeStore(data)
}

export function removeSkillMeta(skillName: string): void {
  const data = readStore()
  delete data.skillMeta[skillName]
  writeStore(data)
}

export function getAllSkillMeta(): SkillMeta[] {
  return Object.values(readStore().skillMeta)
}

// ── GitHub token ──────────────────────────────────────────────────────────────
//
// Stored as "enc:<base64>" when safeStorage is available (OS keychain-backed
// encryption: Keychain on macOS, DPAPI on Windows, libsecret on Linux).
// Falls back to plain text prefixed "plain:" when encryption is unavailable
// (e.g. Linux without a keyring configured), so the code path is the same.

const ENC_PREFIX = 'enc:'
const PLAIN_PREFIX = 'plain:'

export function getGitHubToken(): string | null {
  const raw = readStore().githubToken
  if (!raw) return null

  if (raw.startsWith(ENC_PREFIX)) {
    try {
      return safeStorage.decryptString(Buffer.from(raw.slice(ENC_PREFIX.length), 'base64'))
    } catch {
      return null
    }
  }

  if (raw.startsWith(PLAIN_PREFIX)) {
    return raw.slice(PLAIN_PREFIX.length)
  }

  // Legacy: plain value stored before safeStorage was introduced — re-encrypt on next save
  return raw
}

export function saveGitHubToken(token: string): void {
  const data = readStore()
  if (safeStorage.isEncryptionAvailable()) {
    data.githubToken = ENC_PREFIX + safeStorage.encryptString(token).toString('base64')
  } else {
    data.githubToken = PLAIN_PREFIX + token
  }
  writeStore(data)
}

export function clearGitHubToken(): void {
  const data = readStore()
  delete data.githubToken
  writeStore(data)
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

// ── User sources ──────────────────────────────────────────────────────────────

export function listUserSources(): UserSource[] {
  return readStore().userSources ?? []
}

export function addUserSource(source: Omit<UserSource, 'id' | 'addedAt'>): UserSource {
  const data = readStore()
  const entry: UserSource = { ...source, id: randomUUID(), addedAt: new Date().toISOString() }
  data.userSources = [...(data.userSources ?? []), entry]
  writeStore(data)
  return entry
}

export function removeUserSource(id: string): void {
  const data = readStore()
  data.userSources = (data.userSources ?? []).filter((s) => s.id !== id)
  writeStore(data)
}

export function updateUserSource(
  id: string,
  meta: Partial<Pick<UserSource, 'name' | 'description'>>
): UserSource | null {
  const data = readStore()
  const entry = (data.userSources ?? []).find((s) => s.id === id)
  if (!entry) return null
  if (meta.name !== undefined) entry.name = meta.name
  if (meta.description !== undefined) entry.description = meta.description
  writeStore(data)
  return entry
}

// ── App settings ──────────────────────────────────────────────────────────────
//
// API keys are stored encrypted using the same safeStorage pattern as the GitHub
// token: "enc:<base64>" when OS keychain is available, "plain:<value>" otherwise.
// settings.json stores encrypted blobs — callers always receive plaintext.

/** Internal shape stored in settings.json (values are encrypted blobs). */
interface SettingsFile {
  geminiApiKey?: string
  anthropicApiKey?: string
}

function encryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return ENC_PREFIX + safeStorage.encryptString(value).toString('base64')
  }
  return PLAIN_PREFIX + value
}

function decryptValue(raw: string): string | null {
  if (raw.startsWith(ENC_PREFIX)) {
    try {
      return safeStorage.decryptString(Buffer.from(raw.slice(ENC_PREFIX.length), 'base64'))
    } catch {
      return null
    }
  }
  if (raw.startsWith(PLAIN_PREFIX)) {
    return raw.slice(PLAIN_PREFIX.length)
  }
  // Legacy plaintext without prefix — return as-is (will be re-encrypted on next save)
  return raw
}

function readSettingsFile(): SettingsFile {
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as SettingsFile
  } catch {
    return {}
  }
}

export function getSettings(): AppSettings {
  const file = readSettingsFile()
  return {
    geminiApiKey:    file.geminiApiKey    ? decryptValue(file.geminiApiKey)    ?? undefined : undefined,
    anthropicApiKey: file.anthropicApiKey ? decryptValue(file.anthropicApiKey) ?? undefined : undefined
  }
}

export function updateSettings(updates: Partial<AppSettings>): void {
  const current = readSettingsFile()
  const next: SettingsFile = { ...current }

  if ('geminiApiKey' in updates) {
    const val = updates.geminiApiKey
    if (!val) delete next.geminiApiKey
    else next.geminiApiKey = encryptValue(val)
  }

  if ('anthropicApiKey' in updates) {
    const val = updates.anthropicApiKey
    if (!val) delete next.anthropicApiKey
    else next.anthropicApiKey = encryptValue(val)
  }

  mkdirSync(AGENTS_ROOM_DIR, { recursive: true })
  writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf-8')
}
