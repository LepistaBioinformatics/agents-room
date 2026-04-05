import { useState } from 'react'
import { X, Wand2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DrawerShell } from './ui'
import { mapAIError } from '../lib/ai-error'

function AiBadge(): JSX.Element {
  return (
    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
      AI
    </span>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

function isDirty(name: string, description: string, model: string, body: string): boolean {
  return !!(name || description || model || body)
}

export function CreateSkillDrawer({ open, onClose, onCreated }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState('')
  const [disableModelInvocation, setDisableModelInvocation] = useState(false)
  const [body, setBody] = useState('')
  const [nameError, setNameError] = useState('')
  const [busy, setBusy] = useState(false)
  // AI generation
  const [useAI, setUseAI] = useState(false)
  const [aiDesc, setAiDesc] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [generatedFields, setGeneratedFields] = useState(new Set<string>())

  if (!open) return null

  const reset = (): void => {
    setName('')
    setDescription('')
    setModel('')
    setDisableModelInvocation(false)
    setBody('')
    setNameError('')
    setUseAI(false)
    setAiDesc('')
    setAiError('')
    setGeneratedFields(new Set())
  }

  const handleGenerate = async (): Promise<void> => {
    if (!aiDesc.trim()) return
    setGenerating(true)
    setAiError('')
    try {
      const result = await window.electronAPI.skillAuthoring.generateSkill({ description: aiDesc.trim() })
      if (result.error) { setAiError(mapAIError(result.error)); return }
      if (result.name)        { setName(result.name);               }
      if (result.description) { setDescription(result.description); }
      if (result.model)       { setModel(result.model);             }
      if (result.body)        { setBody(result.body);               }
      setGeneratedFields(new Set(['name', 'description', 'model', 'body']))
    } finally {
      setGenerating(false)
    }
  }

  const clearGen = (field: string): void => {
    setGeneratedFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  const handleClose = (): void => {
    if (isDirty(name, description, model, body)) {
      if (!window.confirm(t('create.discardConfirm'))) return
    }
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setNameError('')
    const trimmed = name.trim()
    if (!trimmed || /[/\\]/.test(trimmed) || trimmed.startsWith('.')) {
      setNameError(t('create.nameInvalid'))
      return
    }
    setBusy(true)
    try {
      const result = await window.electronAPI.skillAuthoring.createSkill({
        name: trimmed, description, model, disableModelInvocation, body
      })
      if (result.error === 'NAME_CONFLICT') {
        setNameError(t('create.nameConflict', { type: 'skill', name: trimmed }))
        return
      }
      if (result.error) {
        setNameError(result.error)
        return
      }
      reset()
      onCreated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <DrawerShell onClose={handleClose}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
        <h2 className="text-base font-bold uppercase tracking-wide text-ag-text-1">
          {t('create.newSkill')}
        </h2>
        <button
          onClick={handleClose}
          className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
        >
          <X size={18} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-5 p-6">
          {/* AI generation toggle */}
          <div className="rounded-lg border border-ag-border bg-ag-surface-2/40 px-4 py-3 space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-ag-text-2">
                <Wand2 size={13} className="text-accent" />
                Generate with AI
              </span>
            </label>
            {useAI && (
              <div className="space-y-2">
                <textarea
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                  placeholder="What should this skill do? (e.g. review PRs and suggest improvements)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-ag-border bg-ag-surface px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
                />
                {aiError && <p className="text-[11px] text-red-400">{aiError}</p>}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!aiDesc.trim() || generating}
                  className="flex items-center gap-1.5 rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Wand2 size={12} /> Generate</>}
                </button>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2 flex items-center gap-2">
              {t('create.skillName')} <span className="text-red-400">*</span>
              {generatedFields.has('name') && <AiBadge />}
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); clearGen('name') }}
              placeholder={t('create.skillNamePlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
            {nameError && (
              <p className="text-[11px] text-red-400">{nameError}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2 flex items-center gap-2">
              {t('create.skillDescription')}
              {generatedFields.has('description') && <AiBadge />}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); clearGen('description') }}
              placeholder={t('create.skillDescriptionPlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
          </div>

          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2 flex items-center gap-2">
              {t('create.skillModel')}
              {generatedFields.has('model') && <AiBadge />}
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => { setModel(e.target.value); clearGen('model') }}
              placeholder={t('create.skillModelPlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
          </div>

          {/* Disable model invocation */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={disableModelInvocation}
              onChange={(e) => setDisableModelInvocation(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm text-ag-text-2">{t('create.skillDisableModel')}</span>
          </label>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2 flex items-center gap-2">
              {t('create.skillBody')} <span className="text-red-400">*</span>
              {generatedFields.has('body') && <AiBadge />}
            </label>
            {!body.trim() && (
              <p className="text-[11px] text-amber-500">
                {t('create.bodyEmpty', { type: 'skill' })}
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); clearGen('body') }}
              placeholder={t('create.skillBodyPlaceholder')}
              rows={14}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 font-mono text-xs text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-ag-border bg-ag-surface-2 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-ag-border px-4 py-2 text-sm text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {busy ? t('create.creating') : t('create.create')}
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}
