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

export type TrustTier = 'trusted' | 'user-trusted' | 'known' | 'unknown'
export type SourceTier = 'official' | 'user-trusted'

export interface SkillMeta {
  skillName: string
  sourceUrl: string
  sourceOwner: string
  sourceRepo: string
  sourcePath: string
  sourceBranch: string
  trustTier: TrustTier
  installedAt: string
}

export interface GitHubRef {
  owner: string
  repo: string
  path: string
  branch: string
}

export interface GitHubRepoInfo {
  stars: number
  orgName: string | null
  description: string | null
  updatedAt: string
}

export interface RemoteSkillCard {
  name: string
  description: string
  model: string | null
  folderName: string
  sourceUrl: string
  files: string[]
  isInstalled: boolean
}

export interface SkillSource {
  id: string
  name: string
  description: string
  owner: string
  repo: string
  path: string
  branch: string
  url: string
  tier: SourceTier
}

export interface SkillPreview {
  skill: RemoteSkillCard
  tier: TrustTier
  repoInfo: GitHubRepoInfo | null
  ref: GitHubRef
}

export interface SkillItem {
  name: string
  description: string
  body: string                // SKILL.md content after frontmatter
  model: string | null
  disableModelInvocation: boolean
  folderPath: string          // full path to skill folder
  source: 'global' | 'workspace'
  workspacePath: string       // '' for global
  meta?: SkillMeta | null
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
