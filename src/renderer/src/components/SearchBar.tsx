import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AgentView, SkillItem, CommandItem } from '../types/agent'
import { typeBadge } from '../lib/variants'
import { cn } from '../lib/utils'

export interface SearchIndexItem {
  type: 'agent' | 'skill' | 'command'
  name: string
  subtitle: string
  tools: string[]
  tags: string[]
  workspaceId: string
  workspaceName: string
  itemPath: string
  item: AgentView | SkillItem | CommandItem
}

interface Props {
  searchIndex: SearchIndexItem[]
  onOpenDetails: (item: SearchIndexItem) => void
  onPanTo: (workspaceId: string, itemPath: string) => void
  open: boolean
  onOpen: () => void
  onClose: () => void
}

function matchesQuery(item: SearchIndexItem, q: string): boolean {
  if (item.name.toLowerCase().includes(q)) return true
  if (item.subtitle.toLowerCase().includes(q)) return true
  if (item.tools.some((t) => t.toLowerCase().includes(q))) return true
  if (item.tags.some((t) => t.toLowerCase().includes(q))) return true
  if (item.type === 'agent') {
    const a = item.item as AgentView
    if (a.model?.toLowerCase().includes(q)) return true
  }
  if (item.type === 'skill') {
    const s = item.item as SkillItem
    if (s.model?.toLowerCase().includes(q)) return true
  }
  return false
}

function SearchModal({ searchIndex, onOpenDetails, onPanTo, onClose }: Omit<Props, 'open' | 'onOpen'>): JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const results = query.trim()
    ? searchIndex.filter((item) => matchesQuery(item, query.toLowerCase().trim())).slice(0, 20)
    : []

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setActiveIndex(0) }, [results.length])

  const handleClose = useCallback(() => {
    setQuery('')
    onClose()
  }, [onClose])

  // Click on backdrop closes
  const handleBackdropClick = (e: React.MouseEvent): void => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      handleClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') { handleClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIndex]) {
      onOpenDetails(results[activeIndex])
      handleClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-2xl border border-ag-border bg-ag-surface shadow-2xl overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ag-border">
          <Search size={15} className="shrink-0 text-ag-text-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-[13px] text-ag-text-1 placeholder:text-ag-text-3 outline-none"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-ag-text-3 hover:text-ag-text-2 transition-colors">
              <X size={13} />
            </button>
          ) : (
            <span className="rounded border border-ag-border px-1.5 py-0.5 text-[10px] text-ag-text-3">Esc</span>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="max-h-72 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={`${result.type}-${result.name}-${result.workspaceId}`}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-2.5 border-b border-ag-border/40 last:border-0 transition-colors',
                    i === activeIndex ? 'bg-ag-surface-2' : 'hover:bg-ag-surface-2/60'
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('shrink-0', typeBadge({ kind: result.type as 'agent' | 'skill' | 'command' }))}>
                      {result.type}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-ag-text-1 truncate">{result.name}</div>
                      <div className="text-[10px] text-ag-text-3 truncate">
                        {result.workspaceName}{result.subtitle ? ` · ${result.subtitle}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => { onPanTo(result.workspaceId, result.itemPath); handleClose() }}
                      className="rounded-md border border-ag-border bg-ag-surface px-2 py-0.5 text-[10px] text-ag-text-3 hover:text-ag-text-2 transition-colors"
                    >
                      {t('search.goTo')}
                    </button>
                    <button
                      onClick={() => { onOpenDetails(result); handleClose() }}
                      className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/20 transition-colors"
                    >
                      {t('search.details')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-ag-border px-4 py-1.5 text-[10px] text-ag-text-3">
              {t('search.resultCount', { count: results.length })} · ↑↓ {t('search.navigate')} · Enter {t('search.open')}
            </div>
          </>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-ag-text-3">
            {t('search.noResults')}
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-4 text-center text-[11px] text-ag-text-3">
            {t('search.hint')}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export function SearchBar({ searchIndex, onOpenDetails, onPanTo, open, onOpen, onClose }: Props): JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <button
        onClick={onOpen}
        className="flex items-center gap-1.5 rounded-lg border border-ag-border bg-ag-surface-2 px-2.5 py-1 text-[11px] text-ag-text-3 transition-colors hover:text-ag-text-2"
      >
        <Search size={11} />
        <span>{t('search.buttonLabel')}</span>
        <span className="rounded border border-ag-border px-1 text-[10px] text-ag-text-3">⌃K</span>
      </button>

      {open && (
        <SearchModal
          searchIndex={searchIndex}
          onOpenDetails={onOpenDetails}
          onPanTo={onPanTo}
          onClose={onClose}
        />
      )}
    </>
  )
}
