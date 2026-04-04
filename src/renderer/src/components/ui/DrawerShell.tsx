import { useEffect } from 'react'

interface DrawerShellProps {
  onClose: () => void
  width?: string
  children: React.ReactNode
}

export function DrawerShell({ onClose, width = 'w-[90%] sm:w-1/2', children }: DrawerShellProps): JSX.Element {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 animate-fade-in" style={{ zIndex: 40 }} onClick={onClose} />
      <div
        className={`fixed right-0 top-0 flex h-full ${width} flex-col bg-ag-surface border-l border-b border-t-2 border-ag-border border-t-zinc-500/60 shadow-2xl animate-slide-in overflow-hidden`}
        style={{ zIndex: 50 }}
      >
        {children}
      </div>
    </>
  )
}
