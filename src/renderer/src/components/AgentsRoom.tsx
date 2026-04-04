import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react'
import type { AgentView, AgentMeta, CanvasPosition, TrashItemType, SkillItem, CommandItem } from '../types/agent'
import type { WorkspaceEntry, WorkspaceItems } from '../types/agent'
import { AgentsCanvas } from './AgentsCanvas'
import type { AgentsCanvasHandle } from './AgentsCanvas'
import { SearchBar } from './SearchBar'
import type { SearchIndexItem } from './SearchBar'
import { AgentDetailDrawer } from './AgentDetailDrawer'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import { CommandDetailDrawer } from './CommandDetailDrawer'
import { CreateSkillDrawer } from './CreateSkillDrawer'
import { CreateCommandDrawer } from './CreateCommandDrawer'
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { TrashPanel } from './TrashPanel'
import { BrowseSkillsPanel } from './BrowseSkillsPanel'
import { AboutModal } from './AboutModal'
import { useTrash } from '../hooks/useTrash'
import { cn } from '../lib/utils'

interface LoadedWorkspace {
  entry: WorkspaceEntry
  items: WorkspaceItems
  position: CanvasPosition
  loading: boolean
}

interface Props {
  workspaces: WorkspaceEntry[]
  loadedWorkspaces: Map<string, LoadedWorkspace>
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onAddWorkspace: () => void
  onRemoveWorkspace: (id: string) => void
  onUpdateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => void
  onPositionChange: (id: string, pos: CanvasPosition) => void
  onReloadAll: () => void
  onReloadWorkspace: (id: string) => void
  onSaveAgentMeta: (agentName: string, sourcePath: string, meta: Partial<AgentMeta>) => Promise<void>
}

export function AgentsRoom({
  workspaces, loadedWorkspaces, sidebarOpen, setSidebarOpen,
  onAddWorkspace, onRemoveWorkspace, onUpdateMeta, onPositionChange,
  onReloadAll, onReloadWorkspace, onSaveAgentMeta
}: Props): JSX.Element {
  const { t } = useTranslation()
  const [selectedAgent, setSelectedAgent] = useState<AgentView | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null)
  const [selectedCommand, setSelectedCommand] = useState<CommandItem | null>(null)
  const [createSkillOpen, setCreateSkillOpen] = useState(false)
  const [createSkillWorkspacePath, setCreateSkillWorkspacePath] = useState('')
  const [createCommandOpen, setCreateCommandOpen] = useState(false)
  const [createCommandDefaultWorkspacePath, setCreateCommandDefaultWorkspacePath] = useState<string | undefined>(undefined)
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set())
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightedItemPath, setHighlightedItemPath] = useState<string | null>(null)
  const canvasRef = useRef<AgentsCanvasHandle>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const ws of loadedWorkspaces.values()) {
      ws.entry.tags.forEach((tag) => tags.add(tag))
      ws.items.agents.forEach((a) => a.meta?.tags?.forEach((tag) => tags.add(tag)))
    }
    return Array.from(tags).sort()
  }, [loadedWorkspaces])

  const toggleTag = (tag: string): void => {
    setActiveTagFilters((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const searchIndex = useMemo((): SearchIndexItem[] => {
    const items: SearchIndexItem[] = []
    for (const ws of loadedWorkspaces.values()) {
      const wsName = ws.entry.displayName || ws.entry.name
      for (const agent of ws.items.agents) {
        items.push({
          type: 'agent',
          name: agent.name,
          subtitle: agent.model ?? '',
          tools: agent.tools,
          tags: agent.meta?.tags ?? [],
          workspaceId: ws.entry.id,
          workspaceName: wsName,
          itemPath: agent.filePath,
          item: agent
        })
      }
      for (const skill of ws.items.skills) {
        items.push({
          type: 'skill',
          name: skill.name,
          subtitle: skill.description ?? '',
          tools: [],
          tags: [],
          workspaceId: ws.entry.id,
          workspaceName: wsName,
          itemPath: skill.folderPath,
          item: skill
        })
      }
      for (const cmd of ws.items.commands) {
        items.push({
          type: 'command',
          name: cmd.name,
          subtitle: cmd.description ?? '',
          tools: [],
          tags: [],
          workspaceId: ws.entry.id,
          workspaceName: wsName,
          itemPath: cmd.filePath,
          item: cmd
        })
      }
    }
    return items
  }, [loadedWorkspaces])

  const handleSearchOpenDetails = useCallback((result: SearchIndexItem): void => {
    if (result.type === 'agent') setSelectedAgent(result.item as AgentView)
    else if (result.type === 'skill') setSelectedSkill(result.item as SkillItem)
    else setSelectedCommand(result.item as CommandItem)
  }, [])

  const handlePanTo = useCallback((workspaceId: string, itemPath: string): void => {
    const ws = loadedWorkspaces.get(workspaceId)
    if (ws) canvasRef.current?.panTo(ws.position.x, ws.position.y)
    setHighlightedItemPath(itemPath)
    setTimeout(() => setHighlightedItemPath(null), 1400)
  }, [loadedWorkspaces])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const selectedWorkspace = selectedWorkspaceId ? (workspaces.find((w) => w.id === selectedWorkspaceId) ?? null) : null
  const [globalLoading, setGlobalLoading] = useState(false)
  const [browsePanelOpen, setBrowsePanelOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const reloadWorkspaceByPath = useCallback((workspacePath: string) => {
    const ws = workspaces.find((w) => w.path === workspacePath)
    if (ws) onReloadWorkspace(ws.id)
  }, [workspaces, onReloadWorkspace])

  const { trashItems, trashOpen, setTrashOpen, loadTrash, restore, deletePermanently } =
    useTrash(reloadWorkspaceByPath)

  const handleReload = async (): Promise<void> => {
    setGlobalLoading(true)
    await onReloadAll()
    setGlobalLoading(false)
  }

  const handleTrash = useCallback(async (
    srcPath: string, workspacePath: string, type: TrashItemType, name: string
  ) => {
    await window.electronAPI.items.trash(srcPath, workspacePath, type, name)
    reloadWorkspaceByPath(workspacePath)
  }, [reloadWorkspaceByPath])

  const handleDuplicate = useCallback(async (srcPath: string, type: TrashItemType) => {
    await window.electronAPI.items.duplicate(srcPath, type)
    const ws = workspaces.find((w) => srcPath.includes(w.path) || w.path === '')
    if (ws) onReloadWorkspace(ws.id)
  }, [workspaces, onReloadWorkspace])

  const handleCopy = useCallback(async (srcPath: string, targetPath: string, type: TrashItemType) => {
    await window.electronAPI.items.copy(srcPath, targetPath, type)
    const targetWs = workspaces.find((w) => w.path === targetPath)
    if (targetWs) onReloadWorkspace(targetWs.id)
  }, [workspaces, onReloadWorkspace])

  const handleCreateSkill = useCallback((workspacePath: string) => {
    setCreateSkillWorkspacePath(workspacePath)
    setCreateSkillOpen(true)
  }, [])

  const handleCreateCommand = useCallback((workspacePath: string) => {
    setCreateCommandDefaultWorkspacePath(workspacePath || undefined)
    setCreateCommandOpen(true)
  }, [])

  const handleOpenTrash = (): void => {
    loadTrash()
    setTrashOpen(true)
  }

  const selectedAgentKey = selectedAgent
    ? `${selectedAgent.name}::${selectedAgent.filePath}`
    : null

  const totalItems = Array.from(loadedWorkspaces.values()).reduce(
    (sum, ws) => sum + ws.items.agents.length + ws.items.skills.length + ws.items.commands.length,
    0
  )

  return (
    <div className="flex h-screen flex-col bg-ag-bg text-ag-text-1">
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ag-border/60 bg-ag-surface/90 px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
            title={sidebarOpen ? t('nav.closeSidebar') : t('nav.openSidebar')}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
          </button>

          <div className="h-4 w-px bg-ag-border" />

          <div className="flex items-center gap-2">
            <div className="h-4 w-4 text-accent">
              <svg viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-ag-text-1">{t('nav.agentsRoom')}</span>
          </div>

          <span className="rounded-full bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 tabular-nums">
            {t('stats.workspaceCount', { count: workspaces.length })} · {t('stats.itemCount', { count: totalItems })}
          </span>

          {globalLoading && <Loader2 size={12} className="animate-spin text-ag-text-3" />}
        </div>

        <SearchBar
          searchIndex={searchIndex}
          onOpenDetails={handleSearchOpenDetails}
          onPanTo={handlePanTo}
          open={searchOpen}
          onOpen={() => setSearchOpen(true)}
          onClose={() => setSearchOpen(false)}
        />

        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            disabled={globalLoading}
            title={t('nav.reloadAll')}
            className="rounded-lg p-1.5 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2 disabled:opacity-40"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleOpenTrash}
            title={t('nav.trash')}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs',
              'text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1'
            )}
          >
            <Trash2 size={13} />
            {t('nav.trash')}
            {trashItems.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                {trashItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="shrink-0 overflow-hidden transition-all duration-200"
          style={{ width: sidebarOpen ? 256 : 0 }}
        >
          {sidebarOpen && (
            <WorkspaceSidebar
              workspaces={workspaces}
              onAdd={onAddWorkspace}
              onRemove={onRemoveWorkspace}
              onUpdateMeta={onUpdateMeta}
              onOpenDetails={(entry) => setSelectedWorkspaceId(entry.id)}
              onBrowseSkills={() => setBrowsePanelOpen(true)}
              onAbout={() => setAboutOpen(true)}
              allTags={allTags}
              activeTagFilters={activeTagFilters}
              onToggleTag={toggleTag}
              onClearTagFilters={() => setActiveTagFilters(new Set())}
            />
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 44px)' }}>
          <AgentsCanvas
            ref={canvasRef}
            loadedWorkspaces={loadedWorkspaces}
            workspaces={workspaces}
            selectedAgentKey={selectedAgentKey}
            onSelectAgent={setSelectedAgent}
            onSelectSkill={setSelectedSkill}
            onSelectCommand={setSelectedCommand}
            onPositionChange={onPositionChange}
            activeTagFilters={activeTagFilters}
            highlightedItemPath={highlightedItemPath}
            onTrash={handleTrash}
            onDuplicate={handleDuplicate}
            onCopy={handleCopy}
            onCreateSkill={handleCreateSkill}
            onCreateCommand={handleCreateCommand}
          />
        </div>
      </div>

      <AgentDetailDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onSaveMeta={onSaveAgentMeta}
      />

      <SkillDetailDrawer
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onUninstalled={() => onReloadWorkspace('global')}
        onEdited={() => onReloadWorkspace('global')}
        onDuplicated={() => onReloadWorkspace('global')}
      />

      <CommandDetailDrawer
        command={selectedCommand}
        onClose={() => setSelectedCommand(null)}
        onEdited={() => {
          const wsId = selectedCommand?.workspacePath
            ? workspaces.find((w) => w.path === selectedCommand.workspacePath)?.id ?? 'global'
            : 'global'
          onReloadWorkspace(wsId)
        }}
      />

      <CreateSkillDrawer
        open={createSkillOpen}
        workspacePath={createSkillWorkspacePath}
        onClose={() => setCreateSkillOpen(false)}
        onCreated={() => onReloadWorkspace('global')}
      />

      <CreateCommandDrawer
        open={createCommandOpen}
        workspaces={workspaces}
        defaultWorkspacePath={createCommandDefaultWorkspacePath}
        onClose={() => setCreateCommandOpen(false)}
        onCreated={(workspacePath) => {
          if (!workspacePath) {
            onReloadWorkspace('global')
          } else {
            const ws = workspaces.find((w) => w.path === workspacePath)
            onReloadWorkspace(ws?.id ?? 'global')
          }
        }}
      />

      <WorkspaceDetailDrawer
        workspace={selectedWorkspace}
        onClose={() => setSelectedWorkspaceId(null)}
        onUpdateMeta={onUpdateMeta}
        onRemove={onRemoveWorkspace}
      />

      {trashOpen && (
        <TrashPanel
          items={trashItems}
          onClose={() => setTrashOpen(false)}
          onRestore={restore}
          onDelete={deletePermanently}
        />
      )}

      {browsePanelOpen && (
        <BrowseSkillsPanel
          onClose={() => setBrowsePanelOpen(false)}
          onInstalled={() => onReloadWorkspace('global')}
        />
      )}

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
