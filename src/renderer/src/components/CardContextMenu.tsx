import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Copy, Files, Trash2, ChevronRight } from 'lucide-react'
import type { WorkspaceEntry } from '../types/agent'
import { cn } from '../lib/utils'

interface Props {
  x: number; y: number
  itemType: 'agent' | 'skill' | 'command'
  srcPath: string; srcWorkspacePath: string
  workspaces: WorkspaceEntry[]; currentWorkspaceId: string
  onClose: () => void
  onCopy: (targetWorkspacePath: string) => void
  onDuplicate: () => void
  onTrash: () => void
}

function MenuItem({ icon, label, right, onClick, danger, disabled }: {
  icon: React.ReactNode; label: string; right?: React.ReactNode
  onClick?: () => void; danger?: boolean; disabled?: boolean
}): JSX.Element {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-40',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300'
          : 'text-ag-text-1 hover:bg-ag-surface-2'
      )}
    >
      <span className={danger ? 'text-red-400' : 'text-ag-text-3'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {right}
    </button>
  )
}

export function CardContextMenu({
  x, y, workspaces, currentWorkspaceId,
  onClose, onCopy, onDuplicate, onTrash
}: Props): JSX.Element {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showCopySubmenu, setShowCopySubmenu] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const targets = workspaces.filter((w) => w.id !== currentWorkspaceId)

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 160),
    zIndex: 1000
  }

  return createPortal(
    <div
      ref={menuRef} style={style}
      className="min-w-[180px] overflow-visible rounded-xl border border-ag-border bg-ag-surface shadow-2xl shadow-black/30 py-1"
    >
      <MenuItem icon={<Files size={13} />} label={t('contextMenu.duplicate')} onClick={() => { onDuplicate(); onClose() }} />

      <div className="relative"
        onMouseEnter={() => setShowCopySubmenu(true)}
        onMouseLeave={() => setShowCopySubmenu(false)}
      >
        <MenuItem
          icon={<Copy size={13} />} label={t('contextMenu.copyToWorkspace')}
          right={<ChevronRight size={12} className="text-ag-text-3" />}
          disabled={targets.length === 0}
        />
        {showCopySubmenu && targets.length > 0 && (
          <div className="absolute left-full top-0 z-50 min-w-[180px] rounded-xl border border-ag-border bg-ag-surface py-1 shadow-2xl shadow-black/30">
            {targets.map((ws) => (
              <button
                key={ws.id} onClick={() => { onCopy(ws.path); onClose() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ag-text-1 hover:bg-ag-surface-2"
              >
                <span>{ws.emoji}</span>
                <span className="truncate">{ws.displayName || ws.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-ag-border/60" />

      <MenuItem icon={<Trash2 size={13} />} label={t('contextMenu.moveToTrash')} onClick={() => { onTrash(); onClose() }} danger />
    </div>,
    document.body
  )
}
