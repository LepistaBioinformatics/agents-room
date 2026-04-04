import { useEffect, useState } from 'react'

interface DangerZoneProps {
  title: string
  description: React.ReactNode
  buttonLabel: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  busy?: boolean
  confirmTimeout?: number
}

export function DangerZone({
  title,
  description,
  buttonLabel,
  confirmLabel,
  onConfirm,
  busy,
  confirmTimeout = 3000
}: DangerZoneProps): JSX.Element {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), confirmTimeout)
    return () => clearTimeout(timer)
  }, [confirming, confirmTimeout])

  const handleClick = (): void => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    void onConfirm()
  }

  return (
    <div className="mx-6 mb-6 mt-2 border border-t-2 border-red-900/40 border-t-red-700/60 bg-red-950/20 px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-red-500/70 mb-1">{title}</div>
      <p className="text-xs text-ag-text-3 mb-3">{description}</p>
      <button
        onClick={handleClick}
        disabled={busy}
        className="border border-red-700/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 disabled:opacity-50 transition-colors"
      >
        {busy ? '…' : confirming ? confirmLabel : buttonLabel}
      </button>
    </div>
  )
}
