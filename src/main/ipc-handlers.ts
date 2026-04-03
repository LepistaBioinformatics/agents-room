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

export function registerIpcHandlers(): void {

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
    const [agents, skills, commands, allMeta] = await Promise.all([
      loadAgentsForWorkspace(workspacePath),
      loadSkillsForWorkspace(workspacePath),
      loadCommandsForWorkspace(workspacePath),
      getAllAgentMeta()
    ])

    const metaMap = new Map(allMeta.map((m) => [`${m.agentName}::${m.sourcePath}`, m]))
    const agentViews = agents.map((a) => ({
      ...a,
      meta: metaMap.get(`${a.name}::${a.filePath}`) ?? null
    }))

    return { agents: agentViews, skills, commands }
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
