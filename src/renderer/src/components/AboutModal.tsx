import { useEffect, useState } from 'react'
import { X, RefreshCw, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { UpdateStatus } from '../../../../preload/updater-types'

interface Props {
  onClose: () => void
}

export function AboutModal({ onClose }: Props): JSX.Element {
  const [version, setVersion] = useState<string>('')
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setVersion)

    const unsubscribe = window.electronAPI.updater.onStatus(setStatus)
    return unsubscribe
  }, [])

  const handleCheckUpdates = (): void => {
    setStatus({ type: 'checking' })
    window.electronAPI.updater.check()
  }

  const handleInstall = (): void => {
    window.electronAPI.updater.install()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-80 border border-ag-border bg-ag-surface shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-ag-text-3 hover:text-ag-text-1 transition-colors"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 border-b border-ag-border px-6 py-8">
          <div className="h-10 w-10 text-accent">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="3" />
              <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-base font-bold uppercase tracking-widest text-ag-text-1">
              Agents Room
            </h2>
            {version && (
              <p className="mt-1 font-mono text-xs text-ag-text-3">v{version}</p>
            )}
          </div>
        </div>

        {/* Update section */}
        <div className="px-6 py-5">
          <UpdateStatusDisplay status={status} />

          <div className="mt-4 flex gap-2">
            {status.type === 'downloaded' ? (
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/80"
              >
                <Download size={12} />
                Install &amp; Restart
              </button>
            ) : (
              <button
                onClick={handleCheckUpdates}
                disabled={status.type === 'checking' || status.type === 'downloading'}
                className="flex-1 flex items-center justify-center gap-1.5 border border-ag-border bg-ag-surface-2 px-3 py-2 text-xs text-ag-text-2 transition-colors hover:bg-ag-surface hover:text-ag-text-1 disabled:opacity-40"
              >
                {status.type === 'checking' || status.type === 'downloading' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Check for updates
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ag-border px-6 py-3 text-center text-[10px] text-ag-text-3">
          MIT License · Agents Room
        </div>
      </div>
    </div>
  )
}

function UpdateStatusDisplay({ status }: { status: UpdateStatus }): JSX.Element {
  if (status.type === 'idle') {
    return <p className="text-xs text-ag-text-3">Check for the latest version.</p>
  }

  if (status.type === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-ag-text-2">
        <Loader2 size={12} className="animate-spin" />
        Checking for updates…
      </div>
    )
  }

  if (status.type === 'not-available') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400">
        <CheckCircle size={12} />
        You're up to date.
      </div>
    )
  }

  if (status.type === 'available') {
    return (
      <div className="flex items-center gap-2 text-xs text-accent">
        <Download size={12} />
        v{status.version} available — downloading…
      </div>
    )
  }

  if (status.type === 'downloading') {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-ag-text-2">
          <span>Downloading update…</span>
          <span className="tabular-nums">{status.percent}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-ag-surface-2">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${status.percent}%` }}
          />
        </div>
      </div>
    )
  }

  if (status.type === 'downloaded') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400">
        <CheckCircle size={12} />
        v{status.version} ready to install.
      </div>
    )
  }

  if (status.type === 'error') {
    return (
      <div className="flex items-start gap-2 text-xs text-red-400">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <span className="break-all">{status.message}</span>
      </div>
    )
  }

  return <></>
}
