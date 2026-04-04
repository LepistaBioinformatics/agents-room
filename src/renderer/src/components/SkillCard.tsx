import { useTranslation } from 'react-i18next'
import type { SkillItem } from '../types/agent'
import { cn, truncate } from '../lib/utils'
import { CardHoverButton } from './ui'
import { cardShell, typeBadge, trustBadge } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

type CardShellProps = VariantProps<typeof cardShell>

interface Props {
  skill: SkillItem
  isSelected: boolean
  onOpen: () => void
  onContextMenu: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}

export function SkillCard({ skill, isSelected, onOpen, onContextMenu, style }: Props): JSX.Element {
  const { t } = useTranslation()
  const desc = truncate(skill.description, 100)

  return (
    <div
      onContextMenu={onContextMenu}
      style={style}
      className={cn(cardShell({ kind: 'skill', selected: isSelected as CardShellProps['selected'] }), 'gap-2 p-3.5 group')}
    >
      <div className="flex items-center gap-1.5">
        <span className={typeBadge({ kind: 'skill' })}>{t('card.skill')}</span>
        {skill.model && (
          <span className="rounded border border-ag-border/50 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] text-ag-text-2">
            {skill.model}
          </span>
        )}
      </div>

      {skill.meta && (
        <span className={trustBadge({ tier: skill.meta.trustTier })}>
          {skill.meta.trustTier}
        </span>
      )}

      <div className="text-sm font-semibold uppercase tracking-wide leading-tight text-ag-text-1">{skill.name}</div>

      {desc && <div className="text-[11px] leading-relaxed text-ag-text-2 line-clamp-2">{desc}</div>}

      <CardHoverButton onClick={() => onOpen()} label={t('card.viewDetails')} color="emerald" />
    </div>
  )
}
