import { ipcMain, dialog } from 'electron'
import { homedir } from 'os'
import { join, extname } from 'path'
import { mkdirSync, existsSync, copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { randomUUID } from 'crypto'
import {
  loadAgentsForWorkspace,
  loadSkillsForWorkspace,
  loadCommandsForWorkspace,
  detectRelationships
} from './agents-reader'
import {
  listWorkspaces,
  addWorkspace,
  removeWorkspace,
  updateWorkspaceMeta,
  getCanvasPosition,
  setCanvasPosition,
  getAgentMeta,
  saveAgentMeta,
  getAllAgentMeta,
  listTrashItems,
  AgentMeta,
  WorkspaceEntry,
  CanvasPosition
} from './surreal-store'
import {
  copyItem,
  duplicateItem,
  trashItem,
  restoreItem,
  permanentlyDeleteItem
} from './file-ops'
import { parseGitHubUrl, fetchRepoInfo, fetchSkillPreview, fetchDirectoryContents, setGitHubToken } from './github-api'
import { TRUSTED_SOURCES, resolveTrustTier } from './skills-allowlist'
import { installSkill, uninstallSkill } from './skills-installer'
import { getSkillMeta, saveSkillMeta, removeSkillMeta, getAllSkillMeta, getGitHubToken, saveGitHubToken, clearGitHubToken, listUserSources, addUserSource, removeUserSource, updateUserSource } from './surreal-store'
import { cacheWrap, cacheDeletePrefix } from './github-cache'

export function registerIpcHandlers(): void {
  // Initialize GitHub token from store so API calls are authenticated from the start
  const storedToken = getGitHubToken()
  if (storedToken) setGitHubToken(storedToken)

  // ── Workspaces ──────────────────────────────────────────────────────────────

  ipcMain.handle('workspaces:list', () => listWorkspaces())

  ipcMain.handle('workspaces:add', async (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select project folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return addWorkspace(result.filePaths[0])
  })

  ipcMain.handle('workspaces:remove', (_event, id: string) => removeWorkspace(id))

  ipcMain.handle(
    'workspaces:update-meta',
    (_event, id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) =>
      updateWorkspaceMeta(id, meta)
  )

  // ── Workspace items ─────────────────────────────────────────────────────────

  ipcMain.handle('workspaces:load-items', async (_event, workspacePath: string) => {
    const [agents, skills, commands, allAgentMeta, allSkillMeta] = await Promise.all([
      loadAgentsForWorkspace(workspacePath),
      loadSkillsForWorkspace(workspacePath),
      loadCommandsForWorkspace(workspacePath),
      getAllAgentMeta(),
      getAllSkillMeta()
    ])

    const metaMap = new Map(allAgentMeta.map((m) => [`${m.agentName}::${m.sourcePath}`, m]))
    const agentViews = agents.map((a) => ({
      ...a,
      meta: metaMap.get(`${a.name}::${a.filePath}`) ?? null
    }))

    const skillMetaMap = new Map(allSkillMeta.map((m) => [m.skillName, m]))
    const skillViews = skills.map((s) => ({
      ...s,
      meta: skillMetaMap.get(s.folderPath.split('/').pop() ?? '') ?? null
    }))

    return { agents: agentViews, skills: skillViews, commands }
  })

  // ── Canvas positions ────────────────────────────────────────────────────────

  ipcMain.handle('canvas:get-position', (_event, id: string) => getCanvasPosition(id))
  ipcMain.handle('canvas:set-position', (_event, id: string, pos: CanvasPosition) =>
    setCanvasPosition(id, pos)
  )

  // ── Agent metadata ──────────────────────────────────────────────────────────

  ipcMain.handle('agent-meta:get', (_event, agentName: string, sourcePath: string) =>
    getAgentMeta(agentName, sourcePath)
  )
  ipcMain.handle('agent-meta:save', (_event, meta: AgentMeta) => saveAgentMeta(meta))
  ipcMain.handle('agent-meta:get-all', () => getAllAgentMeta())

  // ── File operations ─────────────────────────────────────────────────────────

  ipcMain.handle(
    'items:copy',
    (_event, srcPath: string, targetWorkspacePath: string, type: 'agent' | 'skill' | 'command') =>
      copyItem(srcPath, targetWorkspacePath, type)
  )

  ipcMain.handle(
    'items:duplicate',
    (_event, srcPath: string, type: 'agent' | 'skill' | 'command') =>
      duplicateItem(srcPath, type)
  )

  ipcMain.handle(
    'items:trash',
    (_event, srcPath: string, workspacePath: string, type: 'agent' | 'skill' | 'command', itemName: string) =>
      trashItem(srcPath, workspacePath, type, itemName)
  )

  // ── Trash ───────────────────────────────────────────────────────────────────

  ipcMain.handle('trash:list', () => listTrashItems())
  ipcMain.handle('trash:restore', (_event, trashId: string) => restoreItem(trashId))
  ipcMain.handle('trash:delete', (_event, trashId: string) => permanentlyDeleteItem(trashId))

  // ── Workspace CLAUDE.md ─────────────────────────────────────────────────────

  ipcMain.handle('workspace:read-claude-md', (_event, workspacePath: string): { content: string; resolvedPath: string } => {
    if (!workspacePath) {
      const p = join(homedir(), '.claude', 'CLAUDE.md')
      return { content: existsSync(p) ? readFileSync(p, 'utf-8') : '', resolvedPath: p }
    }
    const candidates = [
      join(workspacePath, 'CLAUDE.md'),
      join(workspacePath, '.claude', 'CLAUDE.md')
    ]
    for (const p of candidates) {
      if (existsSync(p)) return { content: readFileSync(p, 'utf-8'), resolvedPath: p }
    }
    return { content: '', resolvedPath: join(workspacePath, 'CLAUDE.md') }
  })

  ipcMain.handle('workspace:write-claude-md', (_event, workspacePath: string, content: string) => {
    if (!workspacePath) {
      writeFileSync(join(homedir(), '.claude', 'CLAUDE.md'), content, 'utf-8')
      return
    }
    // Write to whichever path already has the file; default to root
    const dotClaudePath = join(workspacePath, '.claude', 'CLAUDE.md')
    const rootPath = join(workspacePath, 'CLAUDE.md')
    const target = existsSync(dotClaudePath) ? dotClaudePath : rootPath
    writeFileSync(target, content, 'utf-8')
  })

  ipcMain.handle('workspace:read-settings', (_event, workspacePath: string): Array<{ filename: string; path: string; content: string }> => {
    const dotClaudeDir = workspacePath
      ? join(workspacePath, '.claude')
      : join(homedir(), '.claude')

    if (!existsSync(dotClaudeDir)) return []

    let files: string[]
    try {
      files = readdirSync(dotClaudeDir)
    } catch {
      return []
    }

    return files
      .filter((f) => f === 'settings.json' || /^settings\..+\.json$/.test(f))
      .sort()
      .map((filename) => {
        const filePath = join(dotClaudeDir, filename)
        try {
          return { filename, path: filePath, content: readFileSync(filePath, 'utf-8') }
        } catch {
          return { filename, path: filePath, content: '' }
        }
      })
  })

  // ── Avatars ─────────────────────────────────────────────────────────────────

  ipcMain.handle('avatar:read', (_event, filePath: string): string | null => {
    if (!filePath || !existsSync(filePath)) return null
    try {
      const data = readFileSync(filePath)
      const ext = extname(filePath).toLowerCase()
      const mime: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'
      }
      return `data:${mime[ext] ?? 'image/png'};base64,${data.toString('base64')}`
    } catch {
      return null
    }
  })

  // ── Skills install ──────────────────────────────────────────────────────────

  ipcMain.handle('skills:browse-sources', () => {
    const userSources = listUserSources()
    return [
      ...TRUSTED_SOURCES.map((s) => ({ ...s, tier: 'official' as const })),
      ...userSources.map((s) => ({ ...s, tier: 'user-trusted' as const }))
    ]
  })

  ipcMain.handle('skills:preview-url', async (_event, url: string) => {
    const ref = parseGitHubUrl(url)
    if (!ref) return { error: 'NOT_GITHUB' }

    const cacheKey = `preview:${ref.owner}/${ref.repo}/${ref.branch}/${ref.path}`
    try {
      return await cacheWrap(cacheKey, async () => {
        const [skill, repoInfo] = await Promise.all([
          fetchSkillPreview(ref),
          fetchRepoInfo(ref.owner, ref.repo).catch(() => null)
        ])
        const tier = resolveTrustTier(ref.owner, ref.repo)
        return {
          skill: { ...skill, isInstalled: existsSync(join(homedir(), '.claude', 'skills', skill.folderName)) },
          tier,
          repoInfo,
          ref
        }
      })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        return { error: (err as { code: string }).code }
      }
      return { error: 'NETWORK_ERROR' }
    }
  })

  ipcMain.handle('skills:install', async (_event, ref: { owner: string; repo: string; path: string; branch: string }, skillName: string) => {
    const targetDir = join(homedir(), '.claude', 'skills', skillName)
    if (existsSync(targetDir)) return { conflict: true }

    try {
      const installPath = await installSkill(ref, skillName)
      const officialTier = resolveTrustTier(ref.owner, ref.repo)
      const isUserTrusted = officialTier !== 'trusted'
        && listUserSources().some((s) => s.owner === ref.owner && s.repo === ref.repo)
      const trustTier = officialTier === 'trusted' ? 'trusted' : isUserTrusted ? 'user-trusted' : officialTier
      saveSkillMeta({
        skillName,
        sourceUrl: `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.branch}/${ref.path}`,
        sourceOwner: ref.owner,
        sourceRepo: ref.repo,
        sourcePath: ref.path,
        sourceBranch: ref.branch,
        trustTier,
        installedAt: new Date().toISOString()
      })
      // Invalidate source list cache so isInstalled reflects the new state
      cacheDeletePrefix('source:')
      return { success: true, installPath }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        return { error: (err as { code: string }).code }
      }
      return { error: 'INSTALL_FAILED' }
    }
  })

  ipcMain.handle('skills:uninstall', async (_event, skillName: string) => {
    await uninstallSkill(skillName)
    removeSkillMeta(skillName)
    // Invalidate source list cache so isInstalled reflects the removal
    cacheDeletePrefix('source:')
    return { success: true }
  })

  ipcMain.handle('skills:get-meta', (_event, skillName: string) => getSkillMeta(skillName))

  ipcMain.handle('skills:get-all-meta', () => getAllSkillMeta())

  ipcMain.handle('skills:list-from-source', async (_event, sourceId: string) => {
    const source = TRUSTED_SOURCES.find((s) => s.id === sourceId)
      ?? listUserSources().find((s) => s.id === sourceId)
    if (!source) return { skills: [], error: null }

    const cacheKey = `source:${sourceId}`
    const cached = cacheWrap<{ skills: unknown[]; error: string | null }>(cacheKey, async () => {
      const entries = await fetchDirectoryContents(source.owner, source.repo, source.path, source.branch)
      const dirs = entries.filter((e) => e.type === 'dir')
      const skills = []
      for (const dir of dirs) {
        try {
          const ref = { owner: source.owner, repo: source.repo, path: dir.path, branch: source.branch }
          const skill = await fetchSkillPreview(ref)
          skills.push({
            ...skill,
            isInstalled: existsSync(join(homedir(), '.claude', 'skills', skill.folderName))
          })
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'code' in err) {
            const code = (err as { code: string }).code
            if (code === 'GH_RATE_LIMITED') return { skills, error: 'GH_RATE_LIMITED' }
          }
          // GH_NO_SKILL_MD or other — skip this dir
        }
      }
      return { skills, error: null }
    }).catch((err: unknown) => {
      if (err && typeof err === 'object' && 'code' in err) {
        return { skills: [], error: (err as { code: string }).code }
      }
      return { skills: [], error: 'NETWORK_ERROR' }
    })

    return cached
  })

  // ── GitHub token ────────────────────────────────────────────────────────────

  ipcMain.handle('settings:get-github-token', () => {
    const token = getGitHubToken()
    // Return masked token so UI knows if one is set, without exposing the full value
    return token ? { configured: true, masked: `${token.slice(0, 4)}${'•'.repeat(Math.max(0, token.length - 8))}${token.slice(-4)}` } : { configured: false, masked: null }
  })

  ipcMain.handle('settings:set-github-token', (_event, token: string) => {
    const trimmed = token.trim()
    if (!trimmed) return { error: 'EMPTY_TOKEN' }
    saveGitHubToken(trimmed)
    setGitHubToken(trimmed)
    // Bust all GitHub caches so the new token is used on the next request
    cacheDeletePrefix('source:')
    cacheDeletePrefix('preview:')
    return { success: true }
  })

  ipcMain.handle('settings:clear-github-token', () => {
    clearGitHubToken()
    setGitHubToken(null)
    cacheDeletePrefix('source:')
    cacheDeletePrefix('preview:')
    return { success: true }
  })

  // ── User sources ────────────────────────────────────────────────────────────

  ipcMain.handle('sources:add', async (_event, url: string) => {
    const ref = parseGitHubUrl(url)
    if (!ref) return { error: 'NOT_GITHUB' }

    const isOfficial = TRUSTED_SOURCES.some((s) => s.owner === ref.owner && s.repo === ref.repo)
    if (isOfficial) return { error: 'ALREADY_OFFICIAL' }

    const userSources = listUserSources()
    const isDuplicate = userSources.some(
      (s) => s.owner === ref.owner && s.repo === ref.repo && s.path === ref.path
    )
    if (isDuplicate) return { error: 'ALREADY_EXISTS' }

    let name = `${ref.owner}/${ref.repo}`
    let description = ''
    try {
      const repoInfo = await fetchRepoInfo(ref.owner, ref.repo)
      if (repoInfo.description) description = repoInfo.description
    } catch {
      // Proceed without repo info — name stays as owner/repo
    }

    const source = addUserSource({
      name,
      description,
      owner: ref.owner,
      repo: ref.repo,
      path: ref.path,
      branch: ref.branch,
      url: ref.path
        ? `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.branch}/${ref.path}`
        : `https://github.com/${ref.owner}/${ref.repo}`
    })
    cacheDeletePrefix('source:')
    return { source: { ...source, tier: 'user-trusted' } }
  })

  ipcMain.handle('sources:remove', (_event, id: string) => {
    removeUserSource(id)
    cacheDeletePrefix('source:')
    return { success: true }
  })

  ipcMain.handle('sources:update', (_event, id: string, meta: { name?: string; description?: string }) => {
    const updated = updateUserSource(id, meta)
    return updated ? { source: { ...updated, tier: 'user-trusted' } } : { error: 'NOT_FOUND' }
  })

  // ── Settings write ──────────────────────────────────────────────────────────

  ipcMain.handle('settings:write', (_event, filePath: string, content: string) => {
    try {
      writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'WRITE_FAILED' }
    }
  })

  ipcMain.handle('settings:create', (_event, filePath: string) => {
    try {
      if (!existsSync(filePath)) {
        const dir = filePath.split('/').slice(0, -1).join('/')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(filePath, '{}', 'utf-8')
      }
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'CREATE_FAILED' }
    }
  })

  // Creates .claude/settings.json for a given workspace path (or global ~/.claude if path is empty)
  ipcMain.handle('settings:create-for-workspace', (_event, workspacePath: string) => {
    try {
      const dotClaude = workspacePath
        ? join(workspacePath, '.claude')
        : join(homedir(), '.claude')
      if (!existsSync(dotClaude)) mkdirSync(dotClaude, { recursive: true })
      const filePath = join(dotClaude, 'settings.json')
      if (!existsSync(filePath)) writeFileSync(filePath, '{}', 'utf-8')
      return { success: true }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'CREATE_FAILED' }
    }
  })

  ipcMain.handle('dialog:pick-folder', async (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    const result = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('avatar:pick', async (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Selecionar imagem de avatar',
      properties: ['openFile'],
      filters: [
        {
          name: 'Imagens (PNG, JPG, GIF, WEBP)',
          extensions: ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'gif', 'GIF', 'webp', 'WEBP']
        },
        { name: 'Todos os arquivos', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const src = result.filePaths[0]
    const avatarsDir = join(homedir(), '.agents-room', 'avatars')
    if (!existsSync(avatarsDir)) mkdirSync(avatarsDir, { recursive: true })

    const ext = extname(src) || '.png'
    const destName = `${randomUUID()}${ext}`
    const dest = join(avatarsDir, destName)
    copyFileSync(src, dest)
    return dest
  })
}
