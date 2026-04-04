import { X, FileText, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandItem } from '../types/agent'
import { typeBadge } from '../lib/variants'
import { cn } from '../lib/utils'
import { DrawerShell, SectionBlock, InfoTable, MarkdownContent } from './ui'

interface Props {
  command: CommandItem | null
  onClose: () => void
}

export function CommandDetailDrawer({ command, onClose }: Props): JSX.Element | null {
  const { t } = useTranslation()

  if (!command) return null

  const infoRows = [
    { key: t('cmd.infoKeys.path'), value: command.filePath, mono: true },
    ...(command.workspacePath
      ? [{ key: t('cmd.infoKeys.workspace'), value: command.workspacePath, mono: true }]
      : []),
  ]

  return (
    <DrawerShell onClose={onClose}>
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={cn('rounded-md', typeBadge({ kind: 'command' }))}>{t('card.cmd')}</span>
            <span className={cn('rounded-md', typeBadge({ kind: command.source === 'global' ? 'global' : 'workspace' }))}>
              {t(`cmd.source.${command.source}`)}
            </span>
          </div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-amber-500 dark:text-amber-300/70 leading-tight">
            /{command.name}
          </h2>
          {command.description && (
            <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">{command.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <SectionBlock icon={<Info size={13} />} label={t('cmd.sections.info')}>
          <InfoTable rows={infoRows} />
        </SectionBlock>

        <SectionBlock icon={<FileText size={13} />} label={t('cmd.sections.body')} noBorder>
          {command.body.trim() ? (
            <div className="rounded-xl border border-ag-border bg-ag-surface-2 px-5 py-4">
              <MarkdownContent>{command.body}</MarkdownContent>
            </div>
          ) : (
            <p className="text-sm text-ag-text-3">{t('cmd.noBody')}</p>
          )}
        </SectionBlock>
      </div>
    </DrawerShell>
  )
}
