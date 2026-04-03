import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

// ── Agent types ───────────────────────────────────────────────────────────────

export interface AgentFile {
  name: string
  description: string
  model: string | null
  tools: string[]
  frontmatter: Record<string, unknown>
  body: string
  filePath: string
  source: 'global' | 'workspace'
  workspacePath: string
}

export interface AgentWithRelations extends AgentFile {
  mentions: string[]
  mentionedBy: string[]
}

// ── Skill types ───────────────────────────────────────────────────────────────

export interface SkillItem {
  name: string
  description: string
  model: string | null
  disableModelInvocation: boolean
  folderPath: string
  source: 'global' | 'workspace'
  workspacePath: string
}

// ── Command types ─────────────────────────────────────────────────────────────

export interface CommandItem {
  name: string
  description: string
  filePath: string
  source: 'global' | 'workspace'
  workspacePath: string
}

// ── Agents ────────────────────────────────────────────────────────────────────

async function readAgentsFromDir(
  dir: string,
  source: 'global' | 'workspace',
  workspacePath: string
): Promise<AgentFile[]> {
  if (!existsSync(dir)) return []

  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }

  const agents: AgentFile[] = []

  for (const file of files.filter((f) => f.endsWith('.md') && !f.endsWith('.bak'))) {
    const filePath = join(dir, file)
    try {
      const raw = await readFile(filePath, 'utf-8')
      const parsed = matter(raw)
      const fm = parsed.data as Record<string, unknown>

      let tools: string[] = []
      const rawTools = fm.tools
      if (typeof rawTools === 'string') {
        tools = rawTools.split(',').map((t) => t.trim()).filter(Boolean)
      } else if (Array.isArray(rawTools)) {
        tools = rawTools.map(String)
      }

      agents.push({
        name: String(fm.name ?? file.replace('.md', '')),
        description: String(fm.description ?? ''),
        model: fm.model != null ? String(fm.model) : null,
        tools,
        frontmatter: fm,
        body: parsed.content,
        filePath,
        source,
        workspacePath
      })
    } catch (err) {
      console.error(`[agents-reader] Failed to parse ${filePath}:`, err)
    }
  }

  return agents
}

export function detectRelationships(agents: AgentFile[]): AgentWithRelations[] {
  const nameSet = new Set(agents.map((a) => a.name))
  const regexMap = new Map<string, RegExp>()
  for (const name of nameSet) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regexMap.set(name, new RegExp(`\\b${escaped}\\b`, 'gi'))
  }

  const mentionedByMap = new Map<string, Set<string>>()
  for (const name of nameSet) mentionedByMap.set(name, new Set())

  const withMentions = agents.map((agent) => {
    const mentions: string[] = []
    for (const [otherName, regex] of regexMap) {
      if (otherName === agent.name) continue
      if (regex.test(agent.body) || regex.test(agent.description)) {
        mentions.push(otherName)
        mentionedByMap.get(otherName)?.add(agent.name)
      }
    }
    return { ...agent, mentions, mentionedBy: [] as string[] }
  })

  return withMentions.map((agent) => ({
    ...agent,
    mentionedBy: Array.from(mentionedByMap.get(agent.name) ?? [])
  }))
}

export async function loadAgentsForWorkspace(
  workspacePath: string
): Promise<AgentWithRelations[]> {
  const source: 'global' | 'workspace' = workspacePath === '' ? 'global' : 'workspace'
  const dir =
    workspacePath === ''
      ? join(process.env.HOME ?? '~', '.claude', 'agents')
      : join(workspacePath, '.claude', 'agents')

  const agents = await readAgentsFromDir(dir, source, workspacePath)
  return detectRelationships(agents)
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function loadSkillsForWorkspace(
  workspacePath: string
): Promise<SkillItem[]> {
  const source: 'global' | 'workspace' = workspacePath === '' ? 'global' : 'workspace'
  const dir =
    workspacePath === ''
      ? join(process.env.HOME ?? '~', '.claude', 'skills')
      : join(workspacePath, '.claude', 'skills')

  if (!existsSync(dir)) return []

  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }

  const skills: SkillItem[] = []

  for (const entry of entries) {
    const folderPath = join(dir, entry)
    const skillMdPath = join(folderPath, 'SKILL.md')

    if (!existsSync(skillMdPath)) continue

    try {
      const raw = await readFile(skillMdPath, 'utf-8')
      const parsed = matter(raw)
      const fm = parsed.data as Record<string, unknown>

      skills.push({
        name: String(fm.name ?? entry),
        description: String(fm.description ?? ''),
        body: parsed.content ?? '',
        model: fm.model != null ? String(fm.model) : null,
        disableModelInvocation: Boolean(fm['disable-model-invocation'] ?? false),
        folderPath,
        source,
        workspacePath
      })
    } catch (err) {
      console.error(`[agents-reader] Failed to parse skill ${skillMdPath}:`, err)
    }
  }

  return skills
}

// ── Commands ──────────────────────────────────────────────────────────────────

export async function loadCommandsForWorkspace(
  workspacePath: string
): Promise<CommandItem[]> {
  const source: 'global' | 'workspace' = workspacePath === '' ? 'global' : 'workspace'
  const dir =
    workspacePath === ''
      ? join(process.env.HOME ?? '~', '.claude', 'commands')
      : join(workspacePath, '.claude', 'commands')

  if (!existsSync(dir)) return []

  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }

  const commands: CommandItem[] = []

  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const filePath = join(dir, file)
    try {
      const raw = await readFile(filePath, 'utf-8')
      // First non-empty line as description
      const description = raw.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '') ?? ''
      commands.push({
        name: file.replace('.md', ''),
        description,
        filePath,
        source,
        workspacePath
      })
    } catch {
      // skip
    }
  }

  return commands
}
