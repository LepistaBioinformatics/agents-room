import { useEffect, useState } from 'react'
import { X, FileText, Info, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CommandItem } from '../types/agent'
import { typeBadge } from '../lib/variants'
import { cn } from '../lib/utils'
import { DrawerShell, SectionBlock, InfoTable, MarkdownContent } from './ui'

interface Props {
  command: CommandItem | null
  onClose: () => void
  onEdited?: () => void
}

type DrawerMode = 'view' | 'edit'

export function CommandDetailDrawer({ command, onClose, onEdited }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [mode, setMode] = useState<DrawerMode>('view')
  const [editBody, setEditBody] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setMode('view')
    setSaveError('')
  }, [command])

  if (!command) return null

  const enterEdit = (): void => {
    setEditBody(command.body)
    setSaveError('')
    setMode('edit')
  }

  const isEditDirty = (): boolean => editBody !== command.body

  const handleDiscard = (): void => {
    if (isEditDirty()) {
      if (!window.confirm(t('create.discardConfirm'))) return
    }
    setMode('view')
  }

  const handleSave = async (): Promise<void> => {
    setSaveError('')
    setSaveBusy(true)
    try {
      const result = await window.electronAPI.skillAuthoring.updateCommand({
        filePath: command.filePath,
        body: editBody
      })
      if (result.error) {
        setSaveError(result.error)
        return
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
      setMode('view')
      onEdited?.()
    } finally {
      setSaveBusy(false)
    }
  }

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
            {mode === 'edit' && (
              <span className="rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-[11px] text-accent">
                {t('create.editMode')}
              </span>
            )}
            {savedFlash && (
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] text-emerald-500">
                {t('common.saved')}
              </span>
            )}
          </div>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-amber-500 dark:text-amber-300/70 leading-tight">
            /{command.name}
          </h2>
          {command.description && mode === 'view' && (
            <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">{command.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mode === 'view' && (
            <button
              onClick={enterEdit}
              title={t('create.edit')}
              className="flex items-center gap-1.5 rounded-lg border border-ag-border px-3 py-1.5 text-[11px] font-medium text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1"
            >
              <Pencil size={12} />
              {t('create.edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content — view mode */}
      {mode === 'view' && (
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
      )}

      {/* Content — edit mode */}
      {mode === 'edit' && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-5 p-6">
            {/* Name — read-only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.commandName')}
              </label>
              <div className="rounded-lg border border-ag-border/50 bg-ag-surface/50 px-3 py-2 text-sm text-ag-text-3 font-mono">
                /{command.name}
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.commandBody')}
              </label>
              <textarea
                autoFocus
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={16}
                className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 font-mono text-xs text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none resize-y"
              />
            </div>

            {saveError && (
              <p className="text-[11px] text-red-400">{saveError}</p>
            )}
          </div>

          {/* Edit footer */}
          <div className="shrink-0 border-t border-ag-border bg-ag-surface-2 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-ag-border px-4 py-2 text-sm text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1"
            >
              {t('create.discardChanges')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveBusy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {saveBusy ? t('common.saving') : t('create.saveChanges')}
            </button>
          </div>
        </div>
      )}
    </DrawerShell>
  )
}
