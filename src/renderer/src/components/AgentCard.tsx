import type { AgentView } from '../types/agent'
import { cn } from '../lib/utils'
import { AvatarImg } from './AvatarImg'
import { cardShell, typeBadge } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

type CardShellProps = VariantProps<typeof cardShell>

interface Props {
  agent: AgentView
  isSelected: boolean
  onOpen: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}

const MODEL_BADGE: Record<string, string> = {
  opus:   typeBadge({ model: 'opus' }),
  sonnet: typeBadge({ model: 'sonnet' }),
  haiku:  typeBadge({ model: 'haiku' }),
}

function modelBadgeClass(model: string | null): string {
  if (!model) return typeBadge({ model: 'default' })
  const key = Object.keys(MODEL_BADGE).find((k) => model.toLowerCase().includes(k))
  return key ? MODEL_BADGE[key] : typeBadge({ model: 'default' })
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export function AgentCard({ agent, isSelected, onOpen, onContextMenu, style }: Props): JSX.Element {
  const visibleTools = agent.tools.slice(0, 3)
  const extraTools = agent.tools.length - visibleTools.length
  const desc = truncate(agent.description.replace(/^\p{Emoji_Presentation}+\s*/u, ''), 90)

  return (
    <div
      onContextMenu={onContextMenu}
      style={style}
      className={cn(cardShell({ kind: 'agent', selected: isSelected as CardShellProps['selected'] }), 'gap-2.5 p-3.5 group')}
    >
      <div className="flex items-center gap-2">
        {agent.meta?.avatarPath && (
          <AvatarImg path={agent.meta.avatarPath} size={28} />
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(typeBadge({ kind: agent.source === 'global' ? 'global' : 'workspace' }))}>
            {agent.source}
          </span>
          {agent.model && (
            <span className={modelBadgeClass(agent.model)}>{agent.model}</span>
          )}
        </div>
      </div>

      <div className="text-sm font-semibold uppercase tracking-wide leading-tight text-ag-text-1">{agent.name}</div>

      {desc && <div className="text-[11px] leading-relaxed text-ag-text-2 line-clamp-2">{desc}</div>}

      {agent.meta?.tags && agent.meta.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.meta.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-indigo-900/30 border border-indigo-800/40 px-1.5 py-0.5 text-[10px] text-indigo-300 dark:text-indigo-300">
              {tag}
            </span>
          ))}
        </div>
      )}

      {agent.tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTools.map((t) => (
            <span key={t} className="rounded bg-ag-surface-2 border border-ag-border/60 px-1.5 py-0.5 text-[10px] font-mono text-ag-text-2">
              {t}
            </span>
          ))}
          {extraTools > 0 && <span className="rounded bg-ag-surface-2 px-1.5 py-0.5 text-[10px] text-ag-text-3">+{extraTools}</span>}
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onOpen() }}
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-indigo-600/90 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        Ver detalhes →
      </button>

      {agent.meta?.notes && (
        <div className="absolute bottom-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-indigo-400/80" />
      )}
    </div>
  )
}
