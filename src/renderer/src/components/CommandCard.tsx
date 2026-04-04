import { useTranslation } from 'react-i18next'
import type { CommandItem } from '../types/agent'
import { cn } from '../lib/utils'
import { cardShell, typeBadge } from '../lib/variants'

interface Props {
  command: CommandItem
  isFlashing?: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function CommandCard({ command, isFlashing, onClick, onContextMenu }: Props): JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(cardShell({ kind: 'command' }), 'gap-2 p-3.5', isFlashing && 'card-flash')}
    >
      <div className="flex items-center gap-1.5">
        <span className={typeBadge({ kind: 'command' })}>{t('card.cmd')}</span>
        <span className="font-mono text-xs uppercase tracking-wide text-amber-500 dark:text-amber-300/70">/{command.name}</span>
      </div>
      {command.description && (
        <div className="text-[11px] text-ag-text-2 line-clamp-2">{command.description}</div>
      )}
    </div>
  )
}
