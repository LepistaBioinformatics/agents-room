import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentMeta,
  WorkspaceEntry,
  WorkspaceItems,
  CanvasPosition,
  TrashRecord,
  TrashItemType,
  SkillMeta,
  GitHubRef,
  RemoteSkillCard,
  SkillSource,
  SkillPreview
} from '../renderer/src/types/agent'

export interface GitHubTokenStatus {
  configured: boolean
  masked: string | null
}

export interface ElectronAPI {
  settings: {
    getGitHubToken: () => Promise<GitHubTokenStatus>
    setGitHubToken: (token: string) => Promise<{ success?: boolean; error?: string }>
    clearGitHubToken: () => Promise<{ success: boolean }>
  }
  workspaces: {
    list: () => Promise<WorkspaceEntry[]>
    add: () => Promise<WorkspaceEntry | null>
    remove: (id: string) => Promise<void>
    updateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => Promise<WorkspaceEntry | null>
    loadItems: (workspacePath: string) => Promise<WorkspaceItems>
    readClaudeMd: (workspacePath: string) => Promise<{ content: string; resolvedPath: string }>
    writeClaudeMd: (workspacePath: string, content: string) => Promise<void>
    readSettings: (workspacePath: string) => Promise<Array<{ filename: string; path: string; content: string }>>
  }
  canvas: {
    getPosition: (id: string) => Promise<CanvasPosition | null>
    setPosition: (id: string, pos: CanvasPosition) => Promise<void>
  }
  agentMeta: {
    get: (agentName: string, sourcePath: string) => Promise<AgentMeta | null>
    save: (meta: AgentMeta) => Promise<void>
    getAll: () => Promise<AgentMeta[]>
  }
  items: {
    copy: (srcPath: string, targetWorkspacePath: string, type: TrashItemType) => Promise<void>
    duplicate: (srcPath: string, type: TrashItemType) => Promise<void>
    trash: (srcPath: string, workspacePath: string, type: TrashItemType, itemName: string) => Promise<TrashRecord>
  }
  trash: {
    list: () => Promise<TrashRecord[]>
    restore: (trashId: string) => Promise<{ success: boolean; needsNewLocation?: boolean; itemName?: string }>
    delete: (trashId: string) => Promise<void>
  }
  avatar: {
    pick: () => Promise<string | null>
    read: (filePath: string) => Promise<string | null>
  }
  skills: {
    browseSources: () => Promise<SkillSource[]>
    listFromSource: (sourceId: string) => Promise<{ skills: RemoteSkillCard[]; error: string | null }>
    previewUrl: (url: string) => Promise<SkillPreview | { error: string }>
    install: (ref: GitHubRef, skillName: string) => Promise<{ success?: boolean; conflict?: boolean; installPath?: string; error?: string }>
    uninstall: (skillName: string) => Promise<{ success: boolean }>
    getMeta: (skillName: string) => Promise<SkillMeta | null>
    getAllMeta: () => Promise<SkillMeta[]>
  }
}

const api: ElectronAPI = {
  settings: {
    getGitHubToken: () => ipcRenderer.invoke('settings:get-github-token'),
    setGitHubToken: (token) => ipcRenderer.invoke('settings:set-github-token', token),
    clearGitHubToken: () => ipcRenderer.invoke('settings:clear-github-token')
  },
  workspaces: {
    list: () => ipcRenderer.invoke('workspaces:list'),
    add: () => ipcRenderer.invoke('workspaces:add'),
    remove: (id) => ipcRenderer.invoke('workspaces:remove', id),
    updateMeta: (id, meta) => ipcRenderer.invoke('workspaces:update-meta', id, meta),
    loadItems: (workspacePath) => ipcRenderer.invoke('workspaces:load-items', workspacePath),
    readClaudeMd: (workspacePath) => ipcRenderer.invoke('workspace:read-claude-md', workspacePath),
    writeClaudeMd: (workspacePath, content) => ipcRenderer.invoke('workspace:write-claude-md', workspacePath, content),
    readSettings: (workspacePath) => ipcRenderer.invoke('workspace:read-settings', workspacePath)
  },
  canvas: {
    getPosition: (id) => ipcRenderer.invoke('canvas:get-position', id),
    setPosition: (id, pos) => ipcRenderer.invoke('canvas:set-position', id, pos)
  },
  agentMeta: {
    get: (name, path) => ipcRenderer.invoke('agent-meta:get', name, path),
    save: (meta) => ipcRenderer.invoke('agent-meta:save', meta),
    getAll: () => ipcRenderer.invoke('agent-meta:get-all')
  },
  items: {
    copy: (src, target, type) => ipcRenderer.invoke('items:copy', src, target, type),
    duplicate: (src, type) => ipcRenderer.invoke('items:duplicate', src, type),
    trash: (src, ws, type, name) => ipcRenderer.invoke('items:trash', src, ws, type, name)
  },
  trash: {
    list: () => ipcRenderer.invoke('trash:list'),
    restore: (id) => ipcRenderer.invoke('trash:restore', id),
    delete: (id) => ipcRenderer.invoke('trash:delete', id)
  },
  avatar: {
    pick: () => ipcRenderer.invoke('avatar:pick'),
    read: (filePath) => ipcRenderer.invoke('avatar:read', filePath)
  },
  skills: {
    browseSources: () => ipcRenderer.invoke('skills:browse-sources'),
    listFromSource: (sourceId) => ipcRenderer.invoke('skills:list-from-source', sourceId),
    previewUrl: (url) => ipcRenderer.invoke('skills:preview-url', url),
    install: (ref, skillName) => ipcRenderer.invoke('skills:install', ref, skillName),
    uninstall: (skillName) => ipcRenderer.invoke('skills:uninstall', skillName),
    getMeta: (skillName) => ipcRenderer.invoke('skills:get-meta', skillName),
    getAllMeta: () => ipcRenderer.invoke('skills:get-all-meta')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
