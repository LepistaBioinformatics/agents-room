import { FolderOpen, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onPick: () => void
  onGlobalOnly: () => void
}

export function WorkspacePicker({ onPick, onGlobalOnly }: Props): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0f0f13] text-white">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.6" />
            <circle cx="8" cy="20" r="3" fill="currentColor" opacity="0.4" />
            <circle cx="32" cy="20" r="3" fill="currentColor" opacity="0.4" />
            <circle cx="14" cy="8" r="3" fill="currentColor" opacity="0.4" />
            <circle cx="26" cy="8" r="3" fill="currentColor" opacity="0.4" />
            <line x1="20" y1="14" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <line x1="20" y1="14" x2="26" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <line x1="14" y1="20" x2="17" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <line x1="26" y1="20" x2="23" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('picker.title')}</h1>
        <p className="text-sm text-zinc-400">{t('picker.subtitle')}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <p className="text-sm text-zinc-300">
          {t('picker.description')}
          {' '}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs text-indigo-300">
            {t('picker.globalPath')}
          </code>
          .
        </p>

        <button
          onClick={onPick}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
        >
          <FolderOpen size={16} />
          {t('picker.openFolder')}
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-zinc-800" />
          <span className="text-xs text-zinc-600">{t('picker.or')}</span>
          <div className="flex-1 border-t border-zinc-800" />
        </div>

        <button
          onClick={onGlobalOnly}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
        >
          <Globe size={15} />
          {t('picker.globalOnly')}
        </button>

        <p className="text-center text-xs text-zinc-600">
          {t('picker.helperText')}
        </p>
      </div>

      <p className="mt-6 text-xs text-zinc-600">
        {t('picker.tip')}{' '}
        <code className="text-zinc-500">{t('picker.tipCommand')}</code>{t('picker.tipSuffix')}
      </p>
    </div>
  )
}
