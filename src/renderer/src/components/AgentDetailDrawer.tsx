import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Save, FileText, Wrench, GitBranch, Database, StickyNote, Tag, Camera } from 'lucide-react'
import { AgentView, AgentMeta } from '../types/agent'
import { cn, getInitials } from '../lib/utils'
import { AvatarImg } from './AvatarImg'
import { typeBadge } from '../lib/variants'
import { DrawerShell, SectionBlock, InfoTable, MarkdownContent } from './ui'

interface Props {
  agent: AgentView | null
  onClose: () => void
  onSaveMeta: (agentName: string, sourcePath: string, meta: Partial<AgentMeta>) => Promise<void>
}

const MODEL_LABEL: Record<string, string> = {
  opus: 'Claude Opus',
  sonnet: 'Claude Sonnet',
  haiku: 'Claude Haiku'
}

function modelLabel(model: string | null): string {
  if (!model) return 'default'
  const key = Object.keys(MODEL_LABEL).find((k) => model.toLowerCase().includes(k))
  return key ? MODEL_LABEL[key] : model
}


export function AgentDetailDrawer({ agent, onClose, onSaveMeta }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!agent) return
    setNotes(agent.meta?.notes ?? '')
    setTags(agent.meta?.tags ?? [])
    setAvatarPath(agent.meta?.avatarPath)
    setSaved(false)
    setTagInput('')
  }, [agent])

  const handleSave = useCallback(async () => {
    if (!agent) return
    setSaving(true)
    await onSaveMeta(agent.name, agent.filePath, { notes, tags, avatarPath })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [agent, notes, tags, avatarPath, onSaveMeta])

  const addTag = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim()
      if (!tags.includes(newTag)) setTags((prev) => [...prev, newTag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string): void => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handlePickAvatar = async (): Promise<void> => {
    const path = await window.electronAPI.avatar.pick()
    if (path) setAvatarPath(path)
  }

  if (!agent) return null

  const extraFrontmatter = Object.entries(agent.frontmatter).filter(
    ([key]) => !['name', 'description', 'model', 'tools'].includes(key)
  )

  const metadataRows = [
    ...extraFrontmatter.map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    })),
    { key: t('agent.metaKeys.path'), value: agent.filePath, mono: true }
  ]

  // Determine which section is last so we can set noBorder on it
  const hasNotes = true // Notes section is always rendered
  const hasPrompt = !!agent.body.trim()
  const hasMetadata = extraFrontmatter.length > 0
  const hasRelationships = agent.mentions.length > 0 || agent.mentionedBy.length > 0
  const hasTools = agent.tools.length > 0

  return (
    <DrawerShell onClose={onClose}>
      {/* Header — portrait strip */}
      <div className="shrink-0 border-b border-ag-border">
        {/* Portrait area */}
        <button
          onClick={handlePickAvatar}
          title={t('agent.changeAvatar')}
          className="relative block w-full h-28 overflow-hidden group/portrait"
        >
          {avatarPath ? (
            <AvatarImg path={avatarPath} fill rounded="none" className="h-28" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-accent-surface border-b-2 border-dashed border-accent/30">
              <span className="text-4xl font-bold text-accent/40 tracking-widest select-none">
                {getInitials(agent.name)}
              </span>
            </div>
          )}
          {/* Camera overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/portrait:opacity-100">
            <div className="flex flex-col items-center gap-1.5">
              <Camera size={22} className="text-white" />
              <span className="text-[11px] font-medium text-white/90">
                {avatarPath ? t('agent.changeAvatar') : t('agent.addAvatar')}
              </span>
            </div>
          </div>
        </button>

        {/* Identity below portrait */}
        <div className="flex items-start justify-between gap-3 bg-ag-surface-2 px-5 py-3.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={typeBadge({ kind: agent.source === 'global' ? 'global' : 'workspace' })}>
                {agent.source}
              </span>
              {agent.model && (
                <span className="border border-ag-border/50 bg-ag-surface px-1.5 py-0.5 text-[10px] font-medium text-ag-text-2">
                  {modelLabel(agent.model)}
                </span>
              )}
            </div>
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-ag-text-1 leading-tight">{agent.name}</h2>
            {agent.description && (
              <p className="mt-1 text-[11px] italic text-ag-text-2 leading-relaxed line-clamp-2">
                {agent.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-ag-text-3 transition-colors hover:text-ag-text-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Tags section */}
        <SectionBlock
          icon={<Tag size={13} />}
          label={t('agent.sections.tags')}
          noBorder={!hasTools && !hasRelationships && !hasMetadata && !hasPrompt && hasNotes === false}
        >
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full bg-accent-surface border border-accent-border px-2 py-0.5 text-[11px] font-medium tracking-wide text-accent"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-accent/60 hover:text-accent transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder={t('agent.addTag')}
            className="w-full rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
          />
        </SectionBlock>

        {/* Tools section */}
        {hasTools && (
          <SectionBlock
            icon={<Wrench size={13} />}
            label={t('agent.sections.tools')}
            noBorder={!hasRelationships && !hasMetadata && !hasPrompt && !hasNotes}
          >
            <div className="flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-lg bg-ag-surface-2 border border-ag-border px-3 py-1.5 text-xs font-mono text-ag-text-1"
                >
                  {tool}
                </span>
              ))}
            </div>
          </SectionBlock>
        )}

        {/* Relationships */}
        {hasRelationships && (
          <SectionBlock
            icon={<GitBranch size={13} />}
            label={t('agent.sections.relationships')}
            noBorder={!hasMetadata && !hasPrompt && !hasNotes}
          >
            <div className="space-y-2">
              {agent.mentions.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="shrink-0 rounded bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 mt-0.5">{t('agent.mentionsArrow')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.mentions.map((name) => (
                      <span key={name} className="rounded-md bg-ag-surface-2/60 border border-ag-border px-2 py-0.5 text-xs text-ag-text-1">{name}</span>
                    ))}
                  </div>
                </div>
              )}
              {agent.mentionedBy.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="shrink-0 rounded bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 mt-0.5">{t('agent.referencedBy')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.mentionedBy.map((name) => (
                      <span key={name} className="rounded-md bg-ag-surface-2/60 border border-ag-border px-2 py-0.5 text-xs text-ag-text-1">{name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionBlock>
        )}

        {/* Extra frontmatter + path */}
        {hasMetadata && (
          <SectionBlock
            icon={<Database size={13} />}
            label={t('agent.sections.metadata')}
            noBorder={!hasPrompt && !hasNotes}
          >
            <InfoTable rows={metadataRows} />
          </SectionBlock>
        )}

        {/* Agent prompt body */}
        {hasPrompt && (
          <SectionBlock
            icon={<FileText size={13} />}
            label={t('agent.sections.prompt')}
            noBorder={!hasNotes}
          >
            <div className="rounded-xl border border-ag-border bg-ag-surface-2 px-5 py-4">
              <MarkdownContent>{agent.body}</MarkdownContent>
            </div>
          </SectionBlock>
        )}

        {/* Notes */}
        <SectionBlock
          icon={<StickyNote size={13} />}
          label={t('agent.sections.notes')}
          noBorder
        >
          <p className="mb-2 text-[10px] text-ag-text-3">{t('agent.notesHelper')}</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('agent.notesPlaceholder')}
            rows={5}
            className="w-full resize-none rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className={[
              'mt-2.5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              saved
                ? 'bg-emerald-700/80 text-emerald-100'
                : 'bg-accent/90 text-white hover:bg-accent disabled:opacity-50'
            ].join(' ')}
          >
            <Save size={13} />
            {saving ? t('common.saving') : saved ? t('common.saved') : t('common.save')}
          </button>
        </SectionBlock>
      </div>
    </DrawerShell>
  )
}
