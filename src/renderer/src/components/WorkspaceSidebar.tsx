import { ChevronRight, Plus } from 'lucide-react'
import { AvatarImg } from './AvatarImg'
import type { WorkspaceEntry } from '../types/agent'

interface Props {
  workspaces: WorkspaceEntry[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => void
  onOpenDetails: (entry: WorkspaceEntry) => void
}

function WorkspaceRow({
  entry, onOpenDetails
}: {
  entry: WorkspaceEntry
  onOpenDetails: (entry: WorkspaceEntry) => void
}): JSX.Element {
  const shownName = entry.displayName || entry.name

  return (
    <div className="relative group rounded-xl border border-ag-border bg-ag-surface p-3 transition-colors">
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <AvatarImg path={entry.avatarPath} size={28} />

        {/* Emoji */}
        <span className="text-base leading-none shrink-0">{entry.emoji}</span>

        {/* Name + path */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ag-text-1 leading-tight truncate">{shownName}</div>
          {entry.path && (
            <div className="mt-0.5 truncate text-[10px] text-ag-text-3" title={entry.path}>
              {entry.path}
            </div>
          )}
        </div>
      </div>

      {entry.tags.length > 0 && (
        <div className="mt-2 pl-[60px] flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-ag-surface-2 border border-ag-border/60 px-2 py-0.5 text-[10px] text-ag-text-2">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onOpenDetails(entry)}
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-indigo-600/90 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        Ver detalhes <ChevronRight size={11} />
      </button>
    </div>
  )
}

export function WorkspaceSidebar({ workspaces, onAdd, onOpenDetails }: Props): JSX.Element {
  return (
    <div className="flex h-full flex-col border-r border-ag-border bg-ag-sidebar">
      <div className="flex items-center justify-between border-b border-ag-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">Workspaces</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {workspaces.map((ws) => (
          <WorkspaceRow
            key={ws.id}
            entry={ws}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </div>
  )
}
