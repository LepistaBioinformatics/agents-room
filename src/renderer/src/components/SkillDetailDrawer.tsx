import { useEffect, useState } from 'react'
import { X, FileText, Wrench, Cpu, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SkillItem } from '../types/agent'
import { typeBadge, trustBadge } from '../lib/variants'
import { cn } from '../lib/utils'
import { DrawerShell, SectionBlock, InfoTable, DangerZone, MarkdownContent } from './ui'

interface Props {
  skill: SkillItem | null
  onClose: () => void
  onUninstalled?: () => void
}


export function SkillDetailDrawer({ skill, onClose, onUninstalled }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [uninstallBusy, setUninstallBusy] = useState(false)

  useEffect(() => {
    setUninstallBusy(false)
  }, [skill])

  if (!skill) return null

  const folderName = skill.folderPath.split('/').pop() ?? skill.folderPath

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
            {skill.model && (
              <span className="rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-1">
                {skill.model}
              </span>
            )}
            {skill.disableModelInvocation && (
              <span className="flex items-center gap-1 rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-2">
                <Cpu size={10} /> no model
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wide text-ag-text-1 leading-tight">{skill.name}</h2>
          {skill.description && (
            <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">{skill.description}</p>
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
    </DrawerShell>
  )
}
