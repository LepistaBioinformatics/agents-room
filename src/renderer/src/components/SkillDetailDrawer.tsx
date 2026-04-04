import { useEffect, useState } from 'react'
import { X, FileText, Wrench, Cpu, Globe, Pencil, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SkillItem } from '../types/agent'
import { typeBadge, trustBadge } from '../lib/variants'
import { cn } from '../lib/utils'
import { DrawerShell, SectionBlock, InfoTable, DangerZone, MarkdownContent } from './ui'

interface Props {
  skill: SkillItem | null
  onClose: () => void
  onUninstalled?: () => void
  onEdited?: () => void
  onDuplicated?: (newSkillName: string) => void
}

type DrawerMode = 'view' | 'edit'

export function SkillDetailDrawer({ skill, onClose, onUninstalled, onEdited, onDuplicated }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [uninstallBusy, setUninstallBusy] = useState(false)
  const [mode, setMode] = useState<DrawerMode>('view')
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // Edit fields
  const [editDescription, setEditDescription] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editDisableModel, setEditDisableModel] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setUninstallBusy(false)
    setMode('view')
    setDuplicateBusy(false)
    setSaveError('')
  }, [skill])

  if (!skill) return null

  const folderName = skill.folderPath.split('/').pop() ?? skill.folderPath
  const isInstalled = !!skill.meta

  const enterEdit = (): void => {
    setEditDescription(skill.description)
    setEditModel(skill.model ?? '')
    setEditDisableModel(skill.disableModelInvocation)
    setEditBody(skill.body)
    setSaveError('')
    setMode('edit')
  }

  const isEditDirty = (): boolean =>
    editDescription !== skill.description ||
    editModel !== (skill.model ?? '') ||
    editDisableModel !== skill.disableModelInvocation ||
    editBody !== skill.body

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
      const result = await window.electronAPI.skillAuthoring.updateSkill({
        folderPath: skill.folderPath,
        description: editDescription,
        model: editModel,
        disableModelInvocation: editDisableModel,
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

  const handleDuplicateEdit = async (): Promise<void> => {
    setDuplicateBusy(true)
    try {
      const result = await window.electronAPI.skillAuthoring.duplicateSkill({ sourceName: folderName })
      if (result.error || !result.destName) {
        setSaveError(result.error ?? 'COPY_FAILED')
        return
      }
      onEdited?.()
      onDuplicated?.(result.destName)
    } finally {
      setDuplicateBusy(false)
    }
  }

  const handleUninstall = async (): Promise<void> => {
    setUninstallBusy(true)
    try {
      await window.electronAPI.skills.uninstall(folderName)
      onUninstalled?.()
      onClose()
    } finally {
      setUninstallBusy(false)
    }
  }

  const infoRows = [
    { key: t('skill.infoKeys.folder'), value: folderName, mono: true },
    { key: t('skill.infoKeys.path'), value: skill.folderPath, mono: true },
    ...(skill.workspacePath
      ? [{ key: t('skill.infoKeys.workspace'), value: skill.workspacePath, mono: true }]
      : []),
  ]

  const originValue = skill.meta ? (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={trustBadge({ tier: skill.meta.trustTier })}>
        {skill.meta.trustTier}
      </span>
      <a
        href={skill.meta.sourceUrl}
        onClick={(e) => { e.preventDefault(); window.open(skill.meta!.sourceUrl) }}
        className="text-accent underline decoration-accent-border hover:text-accent/80 text-[11px] break-all"
      >
        {skill.meta.sourceUrl}
      </a>
    </div>
  ) : (
    <span className="text-ag-text-3">{t('skill.originLocal')}</span>
  )

  const originRows = [
    { key: t('skill.infoKeys.origin'), value: originValue },
    ...(skill.meta
      ? [{ key: t('skill.infoKeys.installed'), value: new Date(skill.meta.installedAt).toLocaleDateString() }]
      : []),
  ]

  return (
    <DrawerShell onClose={onClose}>
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={cn('rounded-md', typeBadge({ kind: 'skill' }))}>skill</span>
            <span className={cn('rounded-md', typeBadge({ kind: skill.source === 'global' ? 'global' : 'workspace' }))}>
              {skill.source}
            </span>
            {skill.model && !mode && (
              <span className="rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-1">
                {skill.model}
              </span>
            )}
            {skill.disableModelInvocation && mode === 'view' && (
              <span className="flex items-center gap-1 rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-2">
                <Cpu size={10} /> no model
              </span>
            )}
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
          <h2 className="text-lg font-bold uppercase tracking-wide text-ag-text-1 leading-tight">{skill.name}</h2>
          {skill.description && mode === 'view' && (
            <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">{skill.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mode === 'view' && (
            isInstalled ? (
              <button
                onClick={handleDuplicateEdit}
                disabled={duplicateBusy}
                title={t('create.duplicateEdit')}
                className="flex items-center gap-1.5 rounded-lg border border-ag-border px-3 py-1.5 text-[11px] font-medium text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1 disabled:opacity-50"
              >
                <Copy size={12} />
                {duplicateBusy ? t('create.duplicating') : t('create.duplicateEdit')}
              </button>
            ) : (
              <button
                onClick={enterEdit}
                title={t('create.edit')}
                className="flex items-center gap-1.5 rounded-lg border border-ag-border px-3 py-1.5 text-[11px] font-medium text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1"
              >
                <Pencil size={12} />
                {t('create.edit')}
              </button>
            )
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
          <SectionBlock icon={<Wrench size={13} />} label={t('skill.sections.info')}>
            <InfoTable rows={infoRows} />
          </SectionBlock>

          <SectionBlock icon={<Globe size={13} />} label={t('skill.sections.origin')}>
            <InfoTable rows={originRows} />
          </SectionBlock>

          <SectionBlock icon={<FileText size={13} />} label={t('skill.sections.prompt')} noBorder={!skill.meta}>
            {skill.body.trim() ? (
              <div className="rounded-xl border border-ag-border bg-ag-surface-2 px-5 py-4">
                <MarkdownContent>{skill.body}</MarkdownContent>
              </div>
            ) : (
              <p className="text-sm text-ag-text-3">{t('skill.noPrompt')}</p>
            )}
          </SectionBlock>

          {skill.meta && (
            <DangerZone
              title={t('skill.danger.title')}
              description={t('skill.danger.description', { name: folderName })}
              buttonLabel={t('skill.danger.button')}
              confirmLabel={t('skill.danger.confirm')}
              onConfirm={handleUninstall}
              busy={uninstallBusy}
            />
          )}
        </div>
      )}

      {/* Content — edit mode */}
      {mode === 'edit' && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-5 p-6">
            {/* Name — read-only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.skillName')}
              </label>
              <div className="rounded-lg border border-ag-border/50 bg-ag-surface/50 px-3 py-2 text-sm text-ag-text-3 font-mono">
                {folderName}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.skillDescription')}
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t('create.skillDescriptionPlaceholder')}
                className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
              />
            </div>

            {/* Model */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.skillModel')}
              </label>
              <input
                type="text"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
                placeholder={t('create.skillModelPlaceholder')}
                className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
              />
            </div>

            {/* Disable model invocation */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={editDisableModel}
                onChange={(e) => setEditDisableModel(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm text-ag-text-2">{t('create.skillDisableModel')}</span>
            </label>

            {/* Body */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                {t('create.skillBody')}
              </label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={14}
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
