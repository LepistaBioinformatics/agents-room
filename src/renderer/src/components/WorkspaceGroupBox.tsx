import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTransformContext } from 'react-zoom-pan-pinch'
import { Loader2 } from 'lucide-react'
import type { WorkspaceEntry, WorkspaceItems, AgentView, SkillItem, TrashItemType } from '../types/agent'
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
  onPositionChange: (pos: { x: number; y: number }) => void
  onTrash: (srcPath: string, workspacePath: string, type: TrashItemType, name: string) => Promise<void>
  onDuplicate: (srcPath: string, type: TrashItemType) => Promise<void>
  onCopy: (srcPath: string, targetPath: string, type: TrashItemType) => Promise<void>
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

function SubgroupLabel({ color, label, count }: { color: string; label: string; count: number }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 mb-3', color)}>
      <div className="h-px flex-1 bg-current opacity-20" />
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
      <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">{count}</span>
      <div className="h-px flex-1 bg-current opacity-20" />
    </div>
  )
}

export function WorkspaceGroupBox({
  entry, items, loading, position, workspaces,
  selectedAgentKey, onSelectAgent, onSelectSkill, onPositionChange,
  onTrash, onDuplicate, onCopy
}: Props): JSX.Element {
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

  return (
    <>
      <div
        style={{ position: 'absolute', left: position.x, top: position.y, minWidth: CARDS_PER_ROW * (CARD_W + CARD_GAP) + 40 }}
        className="rounded-2xl border border-ag-border/60 bg-ag-surface-2 shadow-2xl shadow-black/20 backdrop-blur-sm"
      >
        {/* Header */}
        <div
          onMouseDown={onHeaderMouseDown}
          className="flex cursor-grab items-center gap-2.5 rounded-t-2xl border-b border-ag-border/60 bg-ag-surface/60 px-5 py-3.5 active:cursor-grabbing select-none"
        >
          {entry.avatarPath ? (
            <AvatarImg path={entry.avatarPath} size={24} />
          ) : (
            <span className="text-xl leading-none">{entry.emoji}</span>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-ag-text-1 leading-tight">
              {entry.displayName || entry.name}
            </span>
            {entry.path && entry.displayName && (
              <span className="text-[10px] text-ag-text-3 truncate max-w-[240px] leading-tight">
                {entry.path.split('/').pop() ?? entry.path}
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {loading && <Loader2 size={12} className="animate-spin text-ag-text-3" />}
            <span className="rounded-full bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 tabular-nums border border-ag-border/40">
              {totalCount}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {items.agents.length > 0 && (
            <div>
              <SubgroupLabel color="text-indigo-500" label={t('canvas.agents')} count={items.agents.length} />
              <CardGrid items={items.agents} renderCard={(agent) => (
                <AgentCard
                  key={`${agent.name}::${agent.filePath}`}
                  agent={agent}
                  isSelected={selectedAgentKey === `${agent.name}::${agent.filePath}`}
                  onOpen={() => onSelectAgent(agent)}
                  onContextMenu={(e) => openContextMenu(e, agent.filePath, 'agent', agent.name)}
                />
              )} />
            </div>
          )}

          {items.skills.length > 0 && (
            <div>
              <SubgroupLabel color="text-emerald-500" label={t('canvas.skills')} count={items.skills.length} />
              <CardGrid items={items.skills} renderCard={(skill) => (
                <SkillCard
                  key={skill.folderPath}
                  skill={skill}
                  isSelected={false}
                  onOpen={() => onSelectSkill(skill)}
                  onContextMenu={(e) => openContextMenu(e, skill.folderPath, 'skill', skill.name)}
                />
              )} />
            </div>
          )}

          {items.commands.length > 0 && (
            <div>
              <SubgroupLabel color="text-amber-500" label={t('canvas.commands')} count={items.commands.length} />
              <CardGrid items={items.commands} renderCard={(cmd) => (
                <CommandCard
                  key={cmd.filePath}
                  command={cmd}
                  onClick={() => {}}
                  onContextMenu={(e) => openContextMenu(e, cmd.filePath, 'command', cmd.name)}
                />
              )} />
            </div>
          )}

          {totalCount === 0 && !loading && (
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
