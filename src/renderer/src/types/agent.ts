// ── Agents ────────────────────────────────────────────────────────────────────

export interface AgentFile {
  name: string
  description: string
  model: string | null
  tools: string[]
  frontmatter: Record<string, unknown>
  body: string
  filePath: string
  source: 'global' | 'workspace'
}

export interface AgentWithRelations extends AgentFile {
  mentions: string[]
  mentionedBy: string[]
}

export interface AgentMeta {
  agentName: string
  sourcePath: string
  notes: string
  tags: string[]
  avatarPath?: string
  updatedAt: string
}

export interface AgentView extends AgentWithRelations {
  meta: AgentMeta | null
}

// ── Skills ────────────────────────────────────────────────────────────────────

export interface SkillItem {
  name: string
  description: string
  body: string                // SKILL.md content after frontmatter
  model: string | null
  disableModelInvocation: boolean
  folderPath: string          // full path to skill folder
  source: 'global' | 'workspace'
  workspacePath: string       // '' for global
}

// ── Commands ──────────────────────────────────────────────────────────────────

export interface CommandItem {
  name: string               // filename without .md
  description: string        // first non-empty line of content
  filePath: string
  source: 'global' | 'workspace'
  workspacePath: string
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export interface WorkspaceEntry {
  id: string
  path: string               // '' = global (~/.claude)
  name: string
  emoji: string
  tags: string[]
  displayName?: string       // custom display name (overrides name in UI)
  avatarPath?: string        // absolute path to avatar image
  addedAt: string
}

export interface CanvasPosition {
  x: number
  y: number
}

// ── Workspace items bundle ────────────────────────────────────────────────────

export interface WorkspaceItems {
  workspaceId: string
  workspacePath: string
  agents: AgentView[]
  skills: SkillItem[]
  commands: CommandItem[]
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export type TrashItemType = 'agent' | 'skill' | 'command'

export interface TrashRecord {
  id: string
  originalPath: string
  trashPath: string
  itemName: string
  itemType: TrashItemType
  workspacePath: string
  trashedAt: string
}
