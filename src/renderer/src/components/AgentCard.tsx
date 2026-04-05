import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AgentView } from '../types/agent'
import { cn, truncate, getInitials } from '../lib/utils'
import { AvatarImg } from './AvatarImg'
import { CardHoverButton } from './ui'
import { cardShell, typeBadge } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

type CardShellProps = VariantProps<typeof cardShell>

interface Props {
  agent: AgentView
  isSelected: boolean
  isFlashing?: boolean
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

export function AgentCard({ agent, isSelected, isFlashing, onOpen, onContextMenu, style }: Props): JSX.Element {
  const { t } = useTranslation()
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const bgPath = agent.meta?.cardBackground
    if (!bgPath) { setBgDataUrl(null); return }
    let cancelled = false
    window.electronAPI.avatar.read(bgPath).then((url) => {
      if (!cancelled) setBgDataUrl(url)
    }).catch(() => { /* silent fallback */ })
    return () => { cancelled = true }
  }, [agent.meta?.cardBackground])

  const visibleTools = agent.tools.slice(0, 4)
  const extraTools = agent.tools.length - visibleTools.length
  const desc = truncate(agent.description.replace(/^\p{Emoji_Presentation}+\s*/u, ''), 100)
  const initials = getInitials(agent.name)

  return (
    <div
      onContextMenu={onContextMenu}
      style={{
        ...style,
        ...(bgDataUrl ? { backgroundImage: `url(${bgDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
      }}
      className={cn(
        cardShell({ kind: 'agent', selected: isSelected as CardShellProps['selected'] }),
        'group overflow-hidden',
        isFlashing && 'card-flash'
      )}
    >
      {/* Background overlay for legibility */}
      {bgDataUrl && <div className="absolute inset-0 bg-black/60 z-0" />}

      {/* Portrait */}
      <div className="relative h-28 shrink-0 overflow-hidden z-10">
        {agent.meta?.avatarPath ? (
          <AvatarImg
            path={agent.meta.avatarPath}
            fill
            rounded="none"
            className="h-28"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent-surface">
            <span className="text-2xl font-bold text-accent/40 select-none tracking-wide">{initials}</span>
          </div>
        )}

        {/* Notes indicator — overlay top-right */}
        {agent.meta?.notes && (
          <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-accent/80" />
        )}
      </div>

      {/* Identity + content */}
      <div className="relative z-10 flex flex-col gap-2 p-3">
        {/* Name + model */}
        <div>
          <div className="text-[13px] font-bold uppercase leading-tight text-ag-text-1">{agent.name}</div>
          {agent.model && (
            <div className="mt-1">
              <span className={modelBadgeClass(agent.model)}>{agent.model}</span>
            </div>
          )}
        </div>

        {/* Description — lore */}
        {desc && (
          <p className="text-[11px] italic leading-relaxed text-ag-text-2 line-clamp-2">{desc}</p>
        )}

        {/* Tools — abilities */}
        {agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTools.map((tool) => (
              <span key={tool} className="border border-ag-border/60 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ag-text-2">
                {tool}
              </span>
            ))}
            {extraTools > 0 && (
              <span className="border border-ag-border/40 px-1.5 py-0.5 text-[10px] font-medium text-ag-text-3">
                +{extraTools}
              </span>
            )}
          </div>
        )}

        {/* Tags — traits */}
        {agent.meta?.tags && agent.meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.meta.tags.map((tag) => (
              <span key={tag} className="border border-accent-border bg-accent-surface px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <CardHoverButton onClick={() => onOpen()} label={t('card.viewDetails')} />
    </div>
  )
}
