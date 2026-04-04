import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DrawerShell } from './ui'

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

  if (!open) return null

  const reset = (): void => {
    setName('')
    setDescription('')
    setModel('')
    setDisableModelInvocation(false)
    setBody('')
    setNameError('')
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
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.skillName')} <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder={t('create.skillNamePlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
            {nameError && (
              <p className="text-[11px] text-red-400">{nameError}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.skillDescription')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.skillBody')} <span className="text-red-400">*</span>
            </label>
            {!body.trim() && (
              <p className="text-[11px] text-amber-500">
                {t('create.bodyEmpty', { type: 'skill' })}
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
