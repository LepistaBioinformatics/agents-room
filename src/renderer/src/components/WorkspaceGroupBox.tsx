import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransformContext } from 'react-zoom-pan-pinch'
import { Loader2, Plus } from 'lucide-react'
import type { WorkspaceEntry, WorkspaceItems, AgentView, SkillItem, CommandItem, TrashItemType } from '../types/agent'
import { AgentCard } from './AgentCard'
import { SkillCard } from './SkillCard'
import { CommandCard } from './CommandCard'
import { CardContextMenu } from './CardContextMenu'
import { cn } from '../lib/utils'
import { AvatarImg } from './AvatarImg'

interface Props {
  entry: WorkspaceEntry
  items: WorkspaceItems
  loading: boolean
  position: { x: number; y: number }
  workspaces: WorkspaceEntry[]
  selectedAgentKey: string | null
  onSelectAgent: (agent: AgentView) => void
  onSelectSkill: (skill: SkillItem) => void
  onSelectCommand: (command: CommandItem) => void
  onPositionChange: (pos: { x: number; y: number }) => void
  onTrash: (srcPath: string, workspacePath: string, type: TrashItemType, name: string) => Promise<void>
  onDuplicate: (srcPath: string, type: TrashItemType) => Promise<void>
  onCopy: (srcPath: string, targetPath: string, type: TrashItemType) => Promise<void>
  activeTagFilters: Set<string>
  highlightedItemPath: string | null
  onCreateSkill?: () => void
  onCreateCommand?: () => void
  onCreateAgent?: () => void
}

const CARD_W = 200
const CARDS_PER_ROW = 4
const CARD_GAP = 12

interface ContextMenuState {
  x: number; y: number; srcPath: string; type: TrashItemType; name: string
}

function CardGrid<T>({ items, renderCard }: { items: T[]; renderCard: (item: T) => JSX.Element }): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CARDS_PER_ROW}, ${CARD_W}px)`, gap: CARD_GAP }}>
      {items.map(renderCard)}
    </div>
  )
}

function SubgroupLabel({ color, label, count, onAdd }: { color: string; label: string; count: number; onAdd?: () => void }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 mb-3', color)}>
      <div className="h-px flex-1 bg-current opacity-20" />
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
      <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">{count}</span>
      <div className="h-px flex-1 bg-current opacity-20" />
      {onAdd && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onAdd() }}
          className="flex items-center justify-center rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100 hover:bg-current/10"
          title="New"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

export function WorkspaceGroupBox({
  entry, items, loading, position, workspaces,
  selectedAgentKey, onSelectAgent, onSelectSkill, onSelectCommand, onPositionChange, activeTagFilters, highlightedItemPath,
  onTrash, onDuplicate, onCopy, onCreateSkill, onCreateCommand, onCreateAgent
}: Props): JSX.Element | null {
  const { t } = useTranslation()
  const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const { transformState } = useTransformContext()
  const scaleRef = useRef(1)
  scaleRef.current = transformState.scale

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    dragStart.current = { mx: e.clientX, my: e.clientY, bx: position.x, by: position.y }

    const snap = (v: number): number => Math.round(v / 32) * 32

    const onMove = (me: MouseEvent): void => {
      if (!dragStart.current) return
      const scale = scaleRef.current
      onPositionChange({
        x: snap(dragStart.current.bx + (me.clientX - dragStart.current.mx) / scale),
        y: snap(dragStart.current.by + (me.clientY - dragStart.current.my) / scale)
      })
    }
    const onUp = (): void => {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [position, onPositionChange])

  const openContextMenu = (e: React.MouseEvent, srcPath: string, type: TrashItemType, name: string): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, srcPath, type, name })
  }

  const totalCount = items.agents.length + items.skills.length + items.commands.length

  if (activeTagFilters.size > 0) {
    const wsMatch = entry.tags.some((tag) => activeTagFilters.has(tag))
    const agentMatch = items.agents.some((a) => a.meta?.tags?.some((tag) => activeTagFilters.has(tag)))
    if (!wsMatch && !agentMatch) return null
  }

  return (
    <>
      <div
        style={{ position: 'absolute', left: position.x, top: position.y, minWidth: CARDS_PER_ROW * (CARD_W + CARD_GAP) + 40 }}
        className="rounded-2xl border border-ag-border/60 bg-ag-surface-2 shadow-2xl shadow-black/20 backdrop-blur-sm"
      >
        {/* Header */}
        <div
          onMouseDown={onHeaderMouseDown}
          className="flex cursor-grab items-stretch rounded-t-2xl border-b border-ag-border/60 active:cursor-grabbing select-none overflow-hidden"
        >
          {/* Avatar panel — focal point for workspace identity */}
          <div className="flex shrink-0 items-center justify-center border-r border-ag-border/60 bg-ag-surface/40 px-3">
            <AvatarImg
              path={entry.avatarPath}
              size={44}
              rounded="none"
              className="border-2 border-accent/50"
            />
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 bg-ag-surface/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none shrink-0">{entry.emoji}</span>
              <span className="text-sm font-semibold text-ag-text-1 leading-tight truncate">
                {entry.displayName || entry.name}
              </span>
            </div>
            <span className="text-[10px] text-ag-text-3 truncate leading-tight font-mono">
              {entry.path
                ? `~/${entry.path.split('/').slice(-2).join('/')}`
                : '~/.claude/agents'}
            </span>
            {entry.tags.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="border border-ag-border/60 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ag-text-3">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats breakdown */}
          <div className="flex shrink-0 flex-col items-end justify-center gap-1 bg-ag-surface/60 px-4 py-3">
            {loading && <Loader2 size={11} className="animate-spin text-ag-text-3 mb-1" />}
            {items.agents.length > 0 && (
              <span className="text-[10px] font-medium tabular-nums text-accent">
                {items.agents.length} {t('canvas.agents').toLowerCase()}
              </span>
            )}
            {items.skills.length > 0 && (
              <span className="text-[10px] font-medium tabular-nums text-emerald-500">
                {items.skills.length} {t('canvas.skills').toLowerCase()}
              </span>
            )}
            {items.commands.length > 0 && (
              <span className="text-[10px] font-medium tabular-nums text-amber-500">
                {items.commands.length} {t('canvas.commands').toLowerCase()}
              </span>
            )}
            {totalCount === 0 && !loading && (
              <span className="text-[10px] text-ag-text-3 tabular-nums">0</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {(items.agents.length > 0 || onCreateAgent) && (
            <div>
              <SubgroupLabel color="text-accent" label={t('canvas.agents')} count={items.agents.length} onAdd={onCreateAgent} />
              {items.agents.length > 0 && <CardGrid items={items.agents} renderCard={(agent) => (
                <AgentCard
                  key={`${agent.name}::${agent.filePath}`}
                  agent={agent}
                  isSelected={selectedAgentKey === `${agent.name}::${agent.filePath}`}
                  isFlashing={highlightedItemPath === agent.filePath}
                  onOpen={() => onSelectAgent(agent)}
                  onContextMenu={(e) => openContextMenu(e, agent.filePath, 'agent', agent.name)}
                />
              )} />}
            </div>
          )}

          {(items.skills.length > 0 || onCreateSkill) && (
            <div>
              <SubgroupLabel color="text-emerald-500" label={t('canvas.skills')} count={items.skills.length} onAdd={onCreateSkill} />
              {items.skills.length > 0 && (
                <CardGrid items={items.skills} renderCard={(skill) => (
                  <SkillCard
                    key={skill.folderPath}
                    skill={skill}
                    isSelected={false}
                    isFlashing={highlightedItemPath === skill.folderPath}
                    onOpen={() => onSelectSkill(skill)}
                    onContextMenu={(e) => openContextMenu(e, skill.folderPath, 'skill', skill.name)}
                  />
                )} />
              )}
            </div>
          )}

          {(items.commands.length > 0 || onCreateCommand) && (
            <div>
              <SubgroupLabel color="text-amber-500" label={t('canvas.commands')} count={items.commands.length} onAdd={onCreateCommand} />
              {items.commands.length > 0 && (
                <CardGrid items={items.commands} renderCard={(cmd) => (
                  <CommandCard
                    key={cmd.filePath}
                    command={cmd}
                    isFlashing={highlightedItemPath === cmd.filePath}
                    onClick={() => onSelectCommand(cmd)}
                    onContextMenu={(e) => openContextMenu(e, cmd.filePath, 'command', cmd.name)}
                  />
                )} />
              )}
            </div>
          )}

          {totalCount === 0 && !loading && !onCreateSkill && !onCreateCommand && !onCreateAgent && (
            <div className="py-8 text-center text-xs text-ag-text-3">
              {t('canvas.empty')}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x} y={contextMenu.y}
          itemType={contextMenu.type} srcPath={contextMenu.srcPath}
          srcWorkspacePath={entry.path} workspaces={workspaces}
          currentWorkspaceId={entry.id}
          onClose={() => setContextMenu(null)}
          onCopy={(targetPath) => onCopy(contextMenu.srcPath, targetPath, contextMenu.type)}
          onDuplicate={() => onDuplicate(contextMenu.srcPath, contextMenu.type)}
          onTrash={() => onTrash(contextMenu.srcPath, entry.path, contextMenu.type, contextMenu.name)}
        />
      )}
    </>
  )
}
