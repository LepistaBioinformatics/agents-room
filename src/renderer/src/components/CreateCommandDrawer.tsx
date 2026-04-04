import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WorkspaceEntry } from '../types/agent'
import { DrawerShell } from './ui'

interface Props {
  workspaces: WorkspaceEntry[]
  defaultWorkspacePath?: string
  open: boolean
  onClose: () => void
  onCreated: (workspacePath: string) => void
}

function isDirty(name: string, description: string, body: string): boolean {
  return !!(name || description || body)
}

export function CreateCommandDrawer({ workspaces, defaultWorkspacePath, open, onClose, onCreated }: Props): JSX.Element | null {
  const { t } = useTranslation()
  const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [nameError, setNameError] = useState('')
  const [busy, setBusy] = useState(false)

  // Sync default when drawer opens
  useEffect(() => {
    if (open) {
      setSelectedWorkspacePath(defaultWorkspacePath ?? '')
    }
  }, [open, defaultWorkspacePath])

  if (!open) return null

  const reset = (): void => {
    setName('')
    setDescription('')
    setBody('')
    setNameError('')
  }

  const handleClose = (): void => {
    if (isDirty(name, description, body)) {
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
      const result = await window.electronAPI.skillAuthoring.createCommand({
        name: trimmed,
        description,
        body,
        workspacePath: selectedWorkspacePath
      })
      if (result.error === 'NAME_CONFLICT') {
        setNameError(t('create.nameConflict', { type: 'command', name: trimmed }))
        return
      }
      if (result.error) {
        setNameError(result.error)
        return
      }
      reset()
      onCreated(selectedWorkspacePath)
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
          {t('create.newCommand')}
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
          {/* Destination */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.commandDestination')}
            </label>
            <select
              value={selectedWorkspacePath}
              onChange={(e) => setSelectedWorkspacePath(e.target.value)}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 focus:border-accent/60 focus:outline-none"
            >
              <option value="">{t('create.commandDestGlobal')}</option>
              {workspaces.filter((ws) => ws.path).map((ws) => (
                <option key={ws.id} value={ws.path}>
                  {ws.displayName || ws.name} ({ws.path.split('/').slice(-2).join('/')})
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.commandName')} <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder={t('create.commandNamePlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
            {nameError && (
              <p className="text-[11px] text-red-400">{nameError}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.commandDescription')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('create.commandDescriptionPlaceholder')}
              className="rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent/60 focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
              {t('create.commandBody')} <span className="text-red-400">*</span>
            </label>
            {!body.trim() && (
              <p className="text-[11px] text-amber-500">
                {t('create.bodyEmpty', { type: 'command' })}
              </p>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('create.commandBodyPlaceholder')}
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
