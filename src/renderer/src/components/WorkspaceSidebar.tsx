import { ChevronRight, Plus, PackagePlus, Info, Tag, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarImg } from './AvatarImg'
import { cn } from '../lib/utils'
import type { WorkspaceEntry } from '../types/agent'

interface Props {
  workspaces: WorkspaceEntry[]
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => void
  onOpenDetails: (entry: WorkspaceEntry) => void
  onBrowseSkills: () => void
  onAbout: () => void
  allTags: string[]
  activeTagFilters: Set<string>
  onToggleTag: (tag: string) => void
  onClearTagFilters: () => void
}

function WorkspaceRow({
  entry, onOpenDetails
}: {
  entry: WorkspaceEntry
  onOpenDetails: (entry: WorkspaceEntry) => void
}): JSX.Element {
  const { t } = useTranslation()
  const shownName = entry.displayName || entry.name

  return (
    <div className="relative group border border-t-2 border-ag-border border-t-zinc-500/50 bg-ag-surface transition-colors overflow-hidden">
      <div className="flex items-stretch">
        {/* Avatar — prominent left panel */}
        <div className="flex shrink-0 items-center justify-center border-r border-ag-border/60 bg-ag-surface-2/40 px-2.5">
          <AvatarImg
            path={entry.avatarPath}
            size={40}
            rounded="none"
            className="border-2 border-accent/50"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm leading-none shrink-0">{entry.emoji}</span>
            <span className="text-sm font-semibold text-ag-text-1 leading-tight truncate">{shownName}</span>
          </div>
          {entry.path && (
            <div className="mt-0.5 truncate text-[10px] font-mono text-ag-text-3" title={entry.path}>
              ~/{entry.path.split('/').slice(-2).join('/')}
            </div>
          )}
          {entry.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span key={tag} className="border border-ag-border/60 bg-ag-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ag-text-3">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onOpenDetails(entry)}
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-accent/90 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        {t('card.viewDetails')} <ChevronRight size={11} />
      </button>
    </div>
  )
}

export function WorkspaceSidebar({ workspaces, onAdd, onOpenDetails, onBrowseSkills, onAbout, allTags, activeTagFilters, onToggleTag, onClearTagFilters }: Props): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col border-r border-ag-border bg-ag-sidebar">
      <div className="flex items-center justify-between border-b border-ag-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{t('nav.workspaces')}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onBrowseSkills}
            title={t('nav.browseInstallSkills')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1"
          >
            <PackagePlus size={12} />
            <span>{t('nav.skills')}</span>
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1"
          >
            <Plus size={12} /> {t('common.add')}
          </button>
        </div>
      </div>
      {allTags.length > 0 && (
        <div className="shrink-0 border-b border-ag-border px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">
              <Tag size={10} />
              {t('filter.label')}
            </div>
            {activeTagFilters.size > 0 && (
              <button
                onClick={onClearTagFilters}
                className="flex items-center gap-0.5 text-[10px] text-ag-text-3 hover:text-ag-text-2 transition-colors"
                title={t('filter.clear')}
              >
                <X size={10} /> {t('filter.clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                  activeTagFilters.has(tag)
                    ? 'border-accent/60 bg-accent/15 text-accent font-medium'
                    : 'border-ag-border bg-ag-surface-2 text-ag-text-3 hover:text-ag-text-2'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {workspaces.map((ws) => (
          <WorkspaceRow
            key={ws.id}
            entry={ws}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-ag-border px-3 py-2">
        <button
          onClick={onAbout}
          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
        >
          <Info size={11} />
          About &amp; Updates
        </button>
      </div>
    </div>
  )
}
