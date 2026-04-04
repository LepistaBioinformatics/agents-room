import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2, KeyRound, Plus, Trash2 } from 'lucide-react'
import useSWR from 'swr'
import type { RemoteSkillCard, SkillPreview, SkillSource, GitHubRef } from '../types/agent'
import { trustBadge } from '../lib/variants'
import { cn } from '../lib/utils'
import { GitHubTokenModal } from './GitHubTokenModal'

const SWR_TTL = 15 * 60 * 1000 // 15 minutes — matches main-process cache TTL

interface Props {
  onClose: () => void
  onInstalled: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function BrowseSkillsPanel({ onClose, onInstalled }: Props): JSX.Element {
  const { t } = useTranslation()

  function errorMessage(code: string, extra?: { resetAt?: string }): string {
    switch (code) {
      case 'NOT_GITHUB': return t('browse.errors.NOT_GITHUB')
      case 'GH_NOT_FOUND': return t('browse.errors.GH_NOT_FOUND')
      case 'GH_RATE_LIMITED':
        if (extra?.resetAt) {
          try {
            const time = new Date(extra.resetAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            return t('browse.errors.GH_RATE_LIMITED', { time })
          } catch { return t('browse.errors.GH_RATE_LIMITED_UNKNOWN') }
        }
        return t('browse.errors.GH_RATE_LIMITED_UNKNOWN')
      case 'GH_NO_SKILL_MD': return t('browse.errors.GH_NO_SKILL_MD')
      case 'NETWORK_ERROR': return t('browse.errors.NETWORK_ERROR')
      default: return t('browse.errors.GENERIC')
    }
  }
  const [activeTab, setActiveTab] = useState<'browse' | 'url' | 'sources'>('browse')
  const [url, setUrl] = useState('')
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle')
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'success' | 'conflict' | 'error'>('idle')
  const [preview, setPreview] = useState<SkillPreview | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorExtra, setErrorExtra] = useState<{ resetAt?: string } | undefined>(undefined)
  const [installError, setInstallError] = useState<string | null>(null)
  const [unknownAcknowledged, setUnknownAcknowledged] = useState(false)
  const [sources, setSources] = useState<SkillSource[]>([])
  const [selectedSource, setSelectedSource] = useState<SkillSource | null>(null)
  const [skillInstallState, setSkillInstallState] = useState<Record<string, 'idle' | 'installing' | 'success' | 'conflict' | 'error'>>({})
  const [showTokenModal, setShowTokenModal] = useState(false)

  // SWR for the source skill list — cached for 15 min, no focus/reconnect revalidation
  const { data: sourceData, isLoading: sourceLoading, error: sourceError } = useSWR(
    selectedSource ? `source:${selectedSource.id}` : null,
    () => window.electronAPI.skills.listFromSource(selectedSource!.id),
    {
      dedupingInterval: SWR_TTL,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 0
    }
  )

  const sourceSkills: RemoteSkillCard[] = (sourceData?.skills as RemoteSkillCard[] | undefined) ?? []
  const sourceSkillsError: string | null = sourceData?.error ?? (sourceError ? 'NETWORK_ERROR' : null)
  const sourceSkillsState =
    !selectedSource ? 'idle'
    : sourceLoading ? 'loading'
    : sourceSkillsError && sourceSkills.length === 0 ? 'error'
    : 'loaded'

  // Escape key closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Load sources when browse tab is active; auto-select the only source
  useEffect(() => {
    if (activeTab !== 'browse') return
    window.electronAPI.skills.browseSources().then((srcs) => {
      setSources(srcs)
      if (srcs.length === 1 && !selectedSource) setSelectedSource(srcs[0])
    }).catch(() => setSources([]))
  }, [activeTab])

  function selectSource(src: SkillSource): void {
    setSelectedSource(src)
    setSkillInstallState({})
  }

  async function handleSourceInstall(src: SkillSource, skill: RemoteSkillCard): Promise<void> {
    setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'installing' }))
    const ref: GitHubRef = { owner: src.owner, repo: src.repo, path: `${src.path}/${skill.folderName}`, branch: src.branch }
    try {
      const result = await window.electronAPI.skills.install(ref, skill.folderName)
      if (result.success) {
        setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'success' }))
        onInstalled()
      } else if (result.conflict) {
        setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'conflict' }))
      } else {
        setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'error' }))
      }
    } catch {
      setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'error' }))
    }
  }

  async function handlePreview(): Promise<void> {
    if (!url.trim()) return
    setPreviewState('loading')
    setPreview(null)
    setErrorCode(null)
    setErrorExtra(undefined)
    setInstallState('idle')
    setInstallError(null)
    setUnknownAcknowledged(false)

    try {
      const result = await window.electronAPI.skills.previewUrl(url.trim())
      if ('error' in result) {
        // Try to parse structured error codes from the error string
        // The error field may be a code like "GH_NOT_FOUND" or a message
        const raw = result.error as string
        // Check if it looks like a known code (all caps + underscores)
        const codeMatch = raw.match(/^[A-Z_]+$/)
        if (codeMatch) {
          setErrorCode(raw)
        } else {
          // Try to extract a code from a possible "CODE: details" format
          const prefixMatch = raw.match(/^([A-Z_]+):/)
          if (prefixMatch) {
            setErrorCode(prefixMatch[1])
          } else {
            setErrorCode(raw)
          }
        }
        setPreviewState('error')
      } else {
        setPreview(result)
        setPreviewState('preview')
      }
    } catch {
      setErrorCode('NETWORK_ERROR')
      setPreviewState('error')
    }
  }

  async function handleInstall(ref: GitHubRef, folderName: string): Promise<void> {
    setInstallState('installing')
    setInstallError(null)
    try {
      const result = await window.electronAPI.skills.install(ref, folderName)
      if (result.success) {
        setInstallState('success')
        onInstalled()
      } else if (result.conflict) {
        setInstallState('conflict')
      } else {
        setInstallError(result.error ?? 'Install failed.')
        setInstallState('error')
      }
    } catch {
      setInstallError('An unexpected error occurred.')
      setInstallState('error')
    }
  }

  async function handleOverwrite(ref: GitHubRef, folderName: string): Promise<void> {
    setInstallState('installing')
    setInstallError(null)
    try {
      await window.electronAPI.skills.uninstall(folderName)
      const result = await window.electronAPI.skills.install(ref, folderName)
      if (result.success) {
        setInstallState('success')
        onInstalled()
      } else {
        setInstallError(result.error ?? 'Install failed.')
        setInstallState('error')
      }
    } catch {
      setInstallError('An unexpected error occurred.')
      setInstallState('error')
    }
  }

  // ── Browse tab ───────────────────────────────────────────────────────────────

  function renderBrowseTab(): JSX.Element {
    if (sources.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="text-sm text-ag-text-2">{t('browse.noSources')}</p>
          <p className="text-xs text-ag-text-3">
            {t('browse.noSourcesHelper')}
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Source selector (show only when multiple sources) */}
        {sources.length > 1 && (
          <div className="flex flex-col gap-2">
            {sources.map((src) => (
              <button
                key={src.id}
                onClick={() => selectSource(src)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  selectedSource?.id === src.id
                    ? 'border-accent-border bg-accent-surface text-ag-text-1'
                    : 'border-ag-border bg-ag-surface-2 text-ag-text-2 hover:border-ag-border hover:text-ag-text-1'
                )}
              >
                <div>
                  <div className="text-sm font-semibold">{src.name}</div>
                  {src.description && <div className="mt-0.5 text-xs text-ag-text-3">{src.description}</div>}
                </div>
                <span className={trustBadge({ tier: src.tier === 'user-trusted' ? 'user-trusted' : 'trusted' })}>
                  {src.tier === 'user-trusted' ? t('sources.userTrusted') : t('sources.official')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Source header (single source) */}
        {sources.length === 1 && selectedSource && (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-ag-text-1">{selectedSource.name}</span>
              {selectedSource.description && (
                <span className="ml-2 text-xs text-ag-text-3">{selectedSource.description}</span>
              )}
            </div>
            <span className={trustBadge({ tier: selectedSource.tier === 'user-trusted' ? 'user-trusted' : 'trusted' })}>
              {selectedSource.tier === 'user-trusted' ? t('sources.userTrusted') : t('sources.official')}
            </span>
          </div>
        )}

        {/* Skills list */}
        {sourceSkillsState === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-12 text-ag-text-3">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">{t('browse.loadingSkills')}</span>
          </div>
        )}

        {sourceSkillsState === 'error' && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            {sourceSkillsError === 'GH_RATE_LIMITED' ? (
              <span>
                {t('browse.errors.GH_RATE_LIMITED_BROWSE')}{' '}
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="underline underline-offset-2 hover:text-red-300 transition-colors"
                >
                  {t('browse.errors.GH_RATE_LIMITED_BROWSE_CTA')}.
                </button>
              </span>
            ) : t('browse.errors.LOAD_ERROR')}
          </div>
        )}

        {sourceSkillsState === 'loaded' && sourceSkills.length === 0 && (
          <p className="text-sm text-ag-text-3">{t('browse.noSkills')}</p>
        )}

        {sourceSkillsState === 'loaded' && sourceSkills.length > 0 && selectedSource && (
          <div className="flex flex-col gap-2">
            {sourceSkills.map((skill) => {
              const state = skillInstallState[skill.folderName] ?? 'idle'
              return (
                <div key={skill.folderName} className="flex items-center justify-between gap-3 border border-t-2 border-ag-border border-t-accent-border bg-ag-surface-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ag-text-1">{skill.name || skill.folderName}</div>
                    {skill.description && (
                      <div className="mt-0.5 text-xs text-ag-text-3 line-clamp-2">{skill.description}</div>
                    )}
                    {skill.model && (
                      <div className="mt-0.5 text-[11px] text-ag-text-3">{t('browse.model', { model: skill.model })}</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {skill.isInstalled || state === 'success' ? (
                      <span className="rounded-md border border-emerald-800/40 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-400">
                        {t('common.installed')}
                      </span>
                    ) : state === 'conflict' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => void (async () => {
                            setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'installing' }))
                            const src = selectedSource
                            const ref: GitHubRef = { owner: src.owner, repo: src.repo, path: `${src.path}/${skill.folderName}`, branch: src.branch }
                            await window.electronAPI.skills.uninstall(skill.folderName)
                            const result = await window.electronAPI.skills.install(ref, skill.folderName)
                            setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: result.success ? 'success' : 'error' }))
                            if (result.success) onInstalled()
                          })()}
                          className="rounded-md border border-red-700/60 bg-red-950/40 px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/40 transition-colors"
                        >
                          {t('common.overwrite')}
                        </button>
                        <button
                          onClick={() => setSkillInstallState((prev) => ({ ...prev, [skill.folderName]: 'idle' }))}
                          className="rounded-md border border-ag-border px-2.5 py-1 text-xs text-ag-text-3 hover:text-ag-text-2 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : state === 'error' ? (
                      <span className="text-xs text-red-400">{t('common.failed')}</span>
                    ) : (
                      <button
                        onClick={() => void handleSourceInstall(selectedSource, skill)}
                        disabled={state === 'installing'}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {state === 'installing' ? t('common.installing') : t('common.install')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Sources tab ──────────────────────────────────────────────────────────────

  function renderSourcesTab(): JSX.Element {
    const officialSources = sources.filter((s) => s.tier === 'official')
    const userSources = sources.filter((s) => s.tier === 'user-trusted')

    return <SourcesTabContent
      officialSources={officialSources}
      userSources={userSources}
      onSourceAdded={() => {
        // Reload sources list — browse-sources merges official + user
        window.electronAPI.skills.browseSources().then((srcs) => {
          setSources(srcs)
          if (!selectedSource && srcs.length > 0) setSelectedSource(srcs[0])
        }).catch(() => {})
      }}
      t={t}
    />
  }

  // ── Install from URL tab ─────────────────────────────────────────────────────

  function renderInstallTab(): JSX.Element {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* URL input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handlePreview() }}
            placeholder={t('browse.urlPlaceholder')}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 outline-none focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          <button
            onClick={() => void handlePreview()}
            disabled={previewState === 'loading' || !url.trim()}
            className="rounded-lg bg-ag-surface-2 border border-ag-border px-4 py-2 text-sm font-medium text-ag-text-1 hover:bg-ag-surface hover:text-ag-text-1 disabled:opacity-50 transition-colors"
          >
            {previewState === 'loading' ? t('common.loading') : t('common.preview')}
          </button>
        </div>

        {/* Error below input */}
        {previewState === 'error' && errorCode && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            {errorMessage(errorCode, errorExtra)}
          </div>
        )}

        {/* Preview card */}
        {previewState === 'preview' && preview && renderPreviewCard(preview)}
      </div>
    )
  }

  function renderPreviewCard(p: SkillPreview): JSX.Element {
    const { skill, tier, repoInfo, ref } = p
    const isUnknown = tier === 'unknown'
    const installDisabled =
      installState === 'installing' ||
      installState === 'success' ||
      (isUnknown && !unknownAcknowledged)

    return (
      <div className="flex flex-col gap-4 border border-t-2 border-ag-border border-t-accent-border bg-ag-surface-2 px-5 py-4">
        {/* Skill name + description */}
        <div>
          <div className="text-base font-bold text-ag-text-1">{skill.name}</div>
          {skill.description && (
            <div className="mt-1 text-sm text-ag-text-2">{skill.description}</div>
          )}
        </div>

        {/* File list */}
        {skill.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skill.files.map((f) => (
              <span
                key={f}
                className="rounded border border-ag-border bg-ag-surface px-2 py-0.5 font-mono text-[11px] text-ag-text-3"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Model hint */}
        {skill.model && (
          <div className="text-xs text-ag-text-3">
            Model: <span className="text-ag-text-2">{skill.model}</span>
          </div>
        )}

        {/* Trust tier */}
        <div className="flex flex-col gap-2">
          {tier === 'trusted' && (
            <span className={cn(trustBadge({ tier: 'trusted' }))}>{t('browse.trust.trusted')}</span>
          )}

          {tier === 'known' && (
            <div className="flex flex-col gap-1">
              <span className={cn(trustBadge({ tier: 'known' }))}>{t('browse.trust.known')}</span>
              {repoInfo && (
                <div className="text-[11px] text-ag-text-3">
                  {t('browse.trust.repoInfo', { stars: repoInfo.stars, org: repoInfo.orgName ?? 'public repo', date: formatDate(repoInfo.updatedAt) })}
                </div>
              )}
            </div>
          )}

          {tier === 'unknown' && (
            <div className="flex flex-col gap-2">
              <span className={cn(trustBadge({ tier: 'unknown' }))}>{t('browse.trust.unknown')}</span>
              <p className="text-xs text-red-400">{t('browse.trust.unknownWarning')}</p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ag-text-2">
                <input
                  type="checkbox"
                  checked={unknownAcknowledged}
                  onChange={(e) => setUnknownAcknowledged(e.target.checked)}
                  className="accent-[color:rgb(var(--ag-accent))]"
                />
                {t('browse.trust.unknownCheckbox')}
              </label>
            </div>
          )}
        </div>

        {/* Install flow messages */}
        {installState === 'success' && (
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-400">
            {t('browse.installSuccess')}
          </div>
        )}

        {installState === 'error' && installError && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            {installError}
          </div>
        )}

        {installState === 'conflict' && (
          <div className="flex flex-col gap-2 rounded-lg border border-yellow-800/40 bg-yellow-950/30 px-3 py-3">
            <p className="text-xs text-yellow-400">
              {t('browse.conflict', { name: skill.folderName })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleOverwrite(ref, skill.folderName)}
                className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 transition-colors"
              >
                {t('common.overwrite')}
              </button>
              <button
                onClick={() => setInstallState('idle')}
                className="rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-medium text-ag-text-2 hover:text-ag-text-1 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Install button (shown when not in conflict/success) */}
        {installState !== 'conflict' && installState !== 'success' && (
          <button
            onClick={() => void handleInstall(ref, skill.folderName)}
            disabled={installDisabled}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {installState === 'installing' ? t('common.installing') : t('common.install')}
          </button>
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {showTokenModal && <GitHubTokenModal onClose={() => setShowTokenModal(false)} />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 40 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[640px] flex flex-col bg-ag-surface border-l border-b border-t-2 border-ag-border border-t-zinc-500/60 shadow-2xl"
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-ag-border bg-ag-surface-2 px-6 py-5">
          <h2 className="text-sm font-semibold text-ag-text-1">{t('browse.title')}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTokenModal(true)}
              title={t('githubToken.title')}
              className="rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-ag-border px-4 pt-3 shrink-0">
          {(['browse', 'url', 'sources'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-t-md px-4 py-2 text-xs font-medium transition-colors',
                activeTab === tab
                  ? 'border border-b-0 border-ag-border bg-ag-surface text-ag-text-1'
                  : 'text-ag-text-3 hover:text-ag-text-2'
              )}
            >
              {tab === 'browse' ? t('browse.tabs.browse') : tab === 'url' ? t('browse.tabs.url') : t('sources.tab')}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'browse' ? renderBrowseTab() : activeTab === 'url' ? renderInstallTab() : renderSourcesTab()}
        </div>
      </div>
    </>
  )
}

// ── Sources tab sub-component ─────────────────────────────────────────────────

interface SourcesTabContentProps {
  officialSources: SkillSource[]
  userSources: SkillSource[]
  onSourceAdded: () => void
  t: ReturnType<typeof useTranslation>['t']
}

function SourcesTabContent({ officialSources, userSources, onSourceAdded, t }: SourcesTabContentProps): JSX.Element {
  const [addUrl, setAddUrl] = useState('')
  const [addState, setAddState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [addError, setAddError] = useState<string | null>(null)
  const [localUserSources, setLocalUserSources] = useState<SkillSource[]>(userSources)

  // Keep local state in sync when parent reloads sources
  if (localUserSources !== userSources && userSources.length !== localUserSources.length) {
    setLocalUserSources(userSources)
  }

  function errorLabel(code: string): string {
    switch (code) {
      case 'NOT_GITHUB': return t('sources.errors.NOT_GITHUB')
      case 'ALREADY_EXISTS': return t('sources.errors.ALREADY_EXISTS')
      case 'ALREADY_OFFICIAL': return t('sources.errors.ALREADY_OFFICIAL')
      default: return t('sources.errors.GENERIC')
    }
  }

  async function handleAdd(): Promise<void> {
    const url = addUrl.trim()
    if (!url) return
    setAddState('loading')
    setAddError(null)
    try {
      const result = await window.electronAPI.sources.add(url)
      if (result.error) {
        setAddError(errorLabel(result.error))
        setAddState('error')
      } else if (result.source) {
        setLocalUserSources((prev) => [...prev, result.source!])
        setAddUrl('')
        setAddState('idle')
        onSourceAdded()
      }
    } catch {
      setAddError(t('sources.errors.GENERIC'))
      setAddState('error')
    }
  }

  async function handleRemove(id: string): Promise<void> {
    await window.electronAPI.sources.remove(id)
    setLocalUserSources((prev) => prev.filter((s) => s.id !== id))
    onSourceAdded()
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* Official sources (read-only) */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">
          {t('sources.officialSection')}
        </div>
        <div className="flex flex-col gap-2">
          {officialSources.map((src) => (
            <div
              key={src.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ag-text-1">{src.name}</div>
                {src.description && <div className="mt-0.5 text-xs text-ag-text-3 truncate">{src.description}</div>}
              </div>
              <span className={trustBadge({ tier: 'trusted' })}>{t('sources.official')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User sources */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">
          {t('sources.userSection')}
        </div>
        {localUserSources.length === 0 ? (
          <p className="text-xs text-ag-text-3">{t('sources.noUserSources')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {localUserSources.map((src) => (
              <div
                key={src.id}
                className="group flex items-center justify-between gap-3 rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ag-text-1">{src.name}</div>
                  {src.description && <div className="mt-0.5 text-xs text-ag-text-3 truncate">{src.description}</div>}
                  <div className="mt-0.5 text-[10px] font-mono text-ag-text-3 truncate">{src.url}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={trustBadge({ tier: 'user-trusted' })}>{t('sources.userTrusted')}</span>
                  <button
                    onClick={() => void handleRemove(src.id)}
                    title={t('sources.removeConfirm')}
                    className="rounded p-1 text-ag-text-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add source form */}
      <div>
        <p className="mb-2 text-xs text-ag-text-3">{t('sources.addHelper')}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={addUrl}
            onChange={(e) => { setAddUrl(e.target.value); setAddState('idle'); setAddError(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd() }}
            placeholder={t('sources.addPlaceholder')}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 outline-none focus:border-accent-border focus:ring-1 focus:ring-accent/20 transition-colors"
          />
          <button
            onClick={() => void handleAdd()}
            disabled={addState === 'loading' || !addUrl.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {addState === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {addState === 'loading' ? t('sources.adding') : t('common.add')}
          </button>
        </div>
        {addState === 'error' && addError && (
          <p className="mt-2 text-xs text-red-400">{addError}</p>
        )}
      </div>
    </div>
  )
}
