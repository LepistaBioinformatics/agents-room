import type { SkillItem } from '../types/agent'
import { cn } from '../lib/utils'
import { cardShell, typeBadge } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

type CardShellProps = VariantProps<typeof cardShell>

interface Props {
  skill: SkillItem
  isSelected: boolean
  onOpen: () => void
  onContextMenu: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export function SkillCard({ skill, isSelected, onOpen, onContextMenu, style }: Props): JSX.Element {
  const desc = truncate(skill.description, 100)

  return (
    <div
      onContextMenu={onContextMenu}
      style={style}
      className={cn(cardShell({ kind: 'skill', selected: isSelected as CardShellProps['selected'] }), 'gap-2 p-3.5 group')}
    >
      <div className="flex items-center gap-1.5">
        <span className={typeBadge({ kind: 'skill' })}>skill</span>
        {skill.model && (
          <span className="rounded border border-ag-border/50 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] text-ag-text-2">
            {skill.model}
          </span>
        )}
      </div>

      <div className="text-sm font-semibold uppercase tracking-wide leading-tight text-ag-text-1">{skill.name}</div>

      {desc && <div className="text-[11px] leading-relaxed text-ag-text-2 line-clamp-2">{desc}</div>}

      <button
        onClick={(e) => { e.stopPropagation(); onOpen() }}
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-emerald-700/90 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        Ver detalhes →
      </button>
    </div>
  )
}
