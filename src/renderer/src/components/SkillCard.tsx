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
      <div className="text-[13px] font-bold uppercase leading-tight text-ag-text-1">{skill.name}</div>

      <div className="flex items-center gap-1.5">
        <span className={typeBadge({ kind: 'skill' })}>{t('card.skill')}</span>
        {skill.meta && (
          <span className={trustBadge({ tier: skill.meta.trustTier })}>
            {skill.meta.trustTier}
          </span>
        )}
        {skill.model && (
          <span className="border border-ag-border/50 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ag-text-2">
            {skill.model}
          </span>
        )}
      </div>

      {desc && <div className="text-[11px] italic leading-relaxed text-ag-text-2 line-clamp-2">{desc}</div>}

      <CardHoverButton onClick={() => onOpen()} label={t('card.viewDetails')} />
    </div>
  )
}
