import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, KeyRound, ExternalLink } from 'lucide-react'

interface Props {
  onClose: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function GitHubTokenModal({ onClose }: Props): JSX.Element {
  const { t } = useTranslation()
  const [masked, setMasked] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)
  const [input, setInput] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.settings.getGitHubToken().then((status) => {
      setConfigured(status.configured)
      setMasked(status.masked)
    })
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = useCallback(async () => {
    if (!input.trim()) return
    setSaveState('saving')
    setSaveError(null)
    const result = await window.electronAPI.settings.setGitHubToken(input.trim())
    if (result.error) {
      setSaveState('error')
      setSaveError(t(`githubToken.errors.${result.error}`, t('githubToken.errors.EMPTY_TOKEN')))
    } else {
      const status = await window.electronAPI.settings.getGitHubToken()
      setConfigured(status.configured)
      setMasked(status.masked)
      setInput('')
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    }
  }, [input, t])

  const handleClear = useCallback(async () => {
    await window.electronAPI.settings.clearGitHubToken()
    setConfigured(false)
    setMasked(null)
    setInput('')
    setSaveState('idle')
  }, [])

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md border border-t-2 border-ag-border border-t-zinc-500/60 bg-ag-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-ag-border px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-ag-text-2" />
            <h2 className="text-sm font-semibold text-ag-text-1">{t('githubToken.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Description */}
          <p className="text-xs leading-relaxed text-ag-text-2">{t('githubToken.description')}</p>

          {/* Current status */}
          <div className={[
            'rounded-lg border px-3.5 py-2.5 text-xs font-mono',
            configured
              ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-300'
              : 'border-ag-border bg-ag-surface-2 text-ag-text-3'
          ].join(' ')}>
            {configured && masked
              ? t('githubToken.statusConfigured', { masked })
              : t('githubToken.statusNone')}
          </div>

          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ag-text-2 uppercase tracking-wide">
              {t('githubToken.inputLabel')}
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setSaveState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder={t('githubToken.inputPlaceholder')}
              autoComplete="off"
              className="w-full rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 font-mono text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            <p className="text-[10px] text-ag-text-3">{t('githubToken.inputHelper')}</p>
          </div>

          {/* Error */}
          {saveState === 'error' && saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!input.trim() || saveState === 'saving'}
              className={[
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                saveState === 'saved'
                  ? 'bg-emerald-700/80 text-emerald-100'
                  : 'bg-indigo-600/90 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed'
              ].join(' ')}
            >
              {saveState === 'saving' ? t('common.saving') : saveState === 'saved' ? t('common.saved') : t('githubToken.save')}
            </button>

            {configured && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20"
              >
                {t('githubToken.clear')}
              </button>
            )}
          </div>

          {/* Docs link */}
          <a
            href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink size={11} />
            {t('githubToken.docsLink')}
          </a>
        </div>
      </div>
    </div>
  )
}
