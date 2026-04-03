import { useEffect, useState } from 'react'
import { X, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import type { TrashRecord } from '../types/agent'
import { cn } from '../lib/utils'
import { typeBadge } from '../lib/variants'

interface Props {
  items: TrashRecord[]
  onClose: () => void
  onRestore: (id: string) => Promise<{ needsNewLocation?: boolean; itemName?: string }>
  onDelete: (id: string) => Promise<void>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TrashPanel({ items, onClose, onRestore, onDelete }: Props): JSX.Element {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleRestore = async (id: string): Promise<void> => {
    setBusy(id)
    const result = await onRestore(id)
    setBusy(null)
    if (result.needsNewLocation) alert(`Could not restore "${result.itemName}" — original directory no longer exists.`)
  }

  const handleDelete = async (id: string): Promise<void> => {
    setBusy(id)
    await onDelete(id)
    setBusy(null)
    setConfirmDeleteId(null)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 animate-fade-in" style={{ zIndex: 40 }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 flex flex-col bg-ag-surface border-t border-ag-border/80 shadow-2xl animate-slide-up"
        style={{ zIndex: 50, maxHeight: '50vh' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ag-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <Trash2 size={16} className="text-red-500/70" />
            <span className="text-sm font-semibold text-ag-text-1">Trash</span>
            <span className="rounded-full bg-ag-surface-2 border border-ag-border/60 px-2 py-0.5 text-xs text-ag-text-2 tabular-nums">
              {items.length}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ag-text-3 hover:bg-ag-surface-2 hover:text-ag-text-2 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12 text-sm text-ag-text-3">
              Trash is empty
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ag-border/60 bg-ag-surface-2/60">
                <tr>
                  {['Name', 'Type', 'Workspace', 'Trashed', 'Actions'].map((h, i) => (
                    <th key={h} className={cn('py-2.5 text-xs font-medium uppercase tracking-wider text-ag-text-3', i === 4 ? 'px-6 text-right' : i === 0 ? 'px-6 text-left' : 'px-3 text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ag-border/40">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-ag-surface-2/40">
                    <td className="px-6 py-3 font-medium text-ag-text-1">{item.itemName}</td>
                    <td className="px-3 py-3">
                      <span className={typeBadge({ kind: item.itemType as 'agent' | 'skill' | 'command' })}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-ag-text-3 max-w-[180px] truncate">
                      {item.workspacePath || 'Global'}
                    </td>
                    <td className="px-3 py-3 text-xs text-ag-text-3">{formatDate(item.trashedAt)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={12} className="text-red-500" />
                            <span className="text-xs text-red-500">Permanently delete?</span>
                            <button
                              onClick={() => handleDelete(item.id)} disabled={busy === item.id}
                              className="rounded-lg border border-red-700/60 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-900/40 disabled:opacity-50"
                            >
                              Delete permanently
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg px-2.5 py-1 text-xs text-ag-text-3 hover:text-ag-text-2">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(item.id)} disabled={busy === item.id}
                              className="flex items-center gap-1.5 rounded-lg border border-ag-border bg-ag-surface-2 px-2.5 py-1 text-xs text-ag-text-1 hover:border-ag-border hover:bg-ag-surface disabled:opacity-50 transition-colors"
                            >
                              <RotateCcw size={11} /> Restore
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-red-900/40 px-2.5 py-1 text-xs text-red-500/70 hover:border-red-700/50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
