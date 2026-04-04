import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Permissions {
  allow?: string[]
  ask?: string[]
  deny?: string[]
  defaultMode?: string
  additionalDirectories?: string[]
}

interface ParsedSettings {
  permissions?: Permissions
  [key: string]: unknown
}

export interface SettingsFile {
  filename: string
  path: string
  content: string
}

interface Props {
  files: SettingsFile[]
  workspacePath: string  // '' for global
  onFilesReloaded: () => void
}

// ── Tool definitions ──────────────────────────────────────────────────────────

type SpecifierType = 'none' | 'free-text' | 'path' | 'domain' | 'mcp' | 'agent-name' | 'full-text'

const TOOLS: Array<{ id: string; specifier: SpecifierType }> = [
  { id: 'Bash',       specifier: 'free-text'  },
  { id: 'Read',       specifier: 'path'       },
  { id: 'Edit',       specifier: 'path'       },
  { id: 'Write',      specifier: 'path'       },
  { id: 'Glob',       specifier: 'none'       },
  { id: 'Grep',       specifier: 'none'       },
  { id: 'WebFetch',   specifier: 'domain'     },
  { id: 'WebSearch',  specifier: 'none'       },
  { id: 'mcp__',      specifier: 'mcp'        },
  { id: 'Agent',      specifier: 'agent-name' },
  { id: 'custom',     specifier: 'full-text'  },
]

const PATH_PREFIXES = ['/', '~/', '//', './'] as const
type PathPrefix = (typeof PATH_PREFIXES)[number]

const DEFAULT_MODE_VALUES = ['default', 'acceptEdits', 'plan', 'dontAsk', 'bypassPermissions', 'auto']

// ── Rule helpers ──────────────────────────────────────────────────────────────

function parseRule(rule: string): { tool: string; specifier: string | null } {
  if (rule.startsWith('mcp__')) return { tool: 'mcp__', specifier: rule.slice(5) || null }
  if (['Glob', 'Grep', 'WebSearch'].includes(rule)) return { tool: rule, specifier: null }
  const match = rule.match(/^(\w+)\((.+)\)$/)
  if (match) return { tool: match[1], specifier: match[2] }
  return { tool: 'custom', specifier: rule }
}

function buildRule(tool: string, specifier: string, pathPrefix: PathPrefix): string {
  switch (tool) {
    case 'Bash':      return specifier ? `Bash(${specifier})` : 'Bash'
    case 'Read':      return `Read(${pathPrefix}${specifier})`
    case 'Edit':      return `Edit(${pathPrefix}${specifier})`
    case 'Write':     return `Write(${pathPrefix}${specifier})`
    case 'Glob':      return 'Glob'
    case 'Grep':      return 'Grep'
    case 'WebSearch': return 'WebSearch'
    case 'WebFetch':  return `WebFetch(domain:${specifier})`
    case 'mcp__':     return `mcp__${specifier}`
    case 'Agent':     return `Agent(${specifier})`
    default:          return specifier  // custom
  }
}

// Tool color map — inline so we don't need another CVA
function toolBadgeClass(tool: string): string {
  const map: Record<string, string> = {
    Bash:      'bg-orange-950/40 border-orange-800/40 text-orange-300',
    Read:      'bg-sky-950/40 border-sky-800/40 text-sky-300',
    Edit:      'bg-violet-950/40 border-violet-800/40 text-violet-300',
    Write:     'bg-rose-950/40 border-rose-800/40 text-rose-300',
    Glob:      'bg-teal-950/40 border-teal-800/40 text-teal-300',
    Grep:      'bg-teal-950/40 border-teal-800/40 text-teal-300',
    WebFetch:  'bg-cyan-950/40 border-cyan-800/40 text-cyan-300',
    WebSearch: 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300',
    'mcp__':   'bg-purple-950/40 border-purple-800/40 text-purple-300',
    Agent:     'bg-accent-surface border-accent/40 text-accent',
    custom:    'bg-ag-surface-2 border-ag-border text-ag-text-3',
  }
  return `px-1.5 py-0.5 text-[10px] font-medium border uppercase tracking-wide ${map[tool] ?? map.custom}`
}

// ── Main component ────────────────────────────────────────────────────────────

export function PermissionsEditor({ files, workspacePath, onFilesReloaded }: Props): JSX.Element {
  const { t } = useTranslation()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const file = files[selectedIdx] as SettingsFile | undefined

  // ── No files yet ─────────────────────────────────────────────────────────────

  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ag-text-3">{t('workspace.noSettings')}</p>
        <button
          onClick={() => {
            window.electronAPI.settings.createForWorkspace(workspacePath).then(onFilesReloaded)
          }}
          className="self-start rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-1.5 text-xs font-medium text-ag-text-2 hover:text-ag-text-1 transition-colors"
        >
          {t('permissions.createFile')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* File selector tabs (if multiple files) */}
      {files.length > 1 && (
        <div className="flex gap-1 mb-3">
          {files.map((f, idx) => (
            <button
              key={f.path}
              onClick={() => setSelectedIdx(idx)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                selectedIdx === idx
                  ? 'bg-accent/15 border border-accent/30 text-accent'
                  : 'border border-ag-border text-ag-text-3 hover:text-ag-text-2'
              )}
            >
              {f.filename}
            </button>
          ))}
        </div>
      )}

      {file && (
        <FilePermissionsEditor
          key={file.path}
          file={file}
          saveState={saveState}
          setSaveState={setSaveState}
          saveError={saveError}
          setSaveError={setSaveError}
          onFilesReloaded={onFilesReloaded}
          createFile={createFile}
          t={t}
        />
      )}
    </div>
  )
}

// ── Per-file editor ───────────────────────────────────────────────────────────

interface FileEditorProps {
  file: SettingsFile
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  setSaveState: (s: 'idle' | 'saving' | 'saved' | 'error') => void
  saveError: string | null
  setSaveError: (e: string | null) => void
  onFilesReloaded: () => void
  createFile: () => Promise<void>
  t: ReturnType<typeof useTranslation>['t']
}

function FilePermissionsEditor({
  file, saveState, setSaveState, setSaveError, onFilesReloaded, t
}: FileEditorProps): JSX.Element {
  const [showRaw, setShowRaw] = useState(false)
  const [rawContent, setRawContent] = useState(file.content)

  // Try parsing JSON
  let parsed: ParsedSettings | null = null
  let parseError = false
  try {
    parsed = JSON.parse(file.content || '{}') as ParsedSettings
  } catch {
    parseError = true
  }

  const [settings, setSettings] = useState<ParsedSettings>(() => parsed ?? {})

  const save = useCallback(async (updated: ParsedSettings): Promise<void> => {
    setSaveState('saving')
    setSaveError(null)
    try {
      const content = JSON.stringify(updated, null, 2)
      const result = await window.electronAPI.settings.write(file.path, content)
      if (result.error) {
        setSaveState('error')
        setSaveError(result.error)
      } else {
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
        onFilesReloaded()
      }
    } catch {
      setSaveState('error')
      setSaveError(t('permissions.saveError'))
    }
  }, [file.path, setSaveState, setSaveError, onFilesReloaded, t])

  function setPermissions(updater: (prev: Permissions) => Permissions): void {
    const updated = { ...settings, permissions: updater(settings.permissions ?? {}) }
    setSettings(updated)
    void save(updated)
  }

  async function saveRaw(): Promise<void> {
    let parsed2: ParsedSettings
    try {
      parsed2 = JSON.parse(rawContent) as ParsedSettings
    } catch {
      setSaveState('error')
      setSaveError(t('permissions.parseError'))
      return
    }
    setSettings(parsed2)
    setShowRaw(false)
    await save(parsed2)
  }

  // ── Parse error fallback ─────────────────────────────────────────────────────

  if (parseError && !showRaw) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-red-400">{t('permissions.parseError')}</p>
        <button
          onClick={() => setShowRaw(true)}
          className="self-start text-xs text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          {t('permissions.editRaw')}
        </button>
      </div>
    )
  }

  // ── Raw editor ───────────────────────────────────────────────────────────────

  if (showRaw) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-ag-text-3">{t('permissions.rawHelper')}</p>
        <textarea
          value={rawContent}
          onChange={(e) => setRawContent(e.target.value)}
          rows={16}
          className="w-full resize-none rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3 font-mono text-[11px] text-ag-text-1 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={() => void saveRaw()}
            disabled={saveState === 'saving'}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saveState === 'saving' ? t('permissions.saving') : t('permissions.saveRaw')}
          </button>
          <button
            onClick={() => setShowRaw(false)}
            className="rounded-lg border border-ag-border px-4 py-1.5 text-xs text-ag-text-2 hover:text-ag-text-1 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
        {saveState === 'error' && (
          <p className="text-xs text-red-400">{t('permissions.saveError')}</p>
        )}
      </div>
    )
  }

  // ── Structured editor ─────────────────────────────────────────────────────────

  const perms = settings.permissions ?? {}
  const hasPermissions = settings.permissions !== undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Save status */}
      {saveState !== 'idle' && (
        <p className={cn('text-xs', saveState === 'error' ? 'text-red-400' : saveState === 'saved' ? 'text-emerald-400' : 'text-ag-text-3')}>
          {saveState === 'saving' ? t('permissions.saving') : saveState === 'saved' ? t('permissions.saved') : t('permissions.saveError')}
        </p>
      )}

      {/* No permissions block yet */}
      {!hasPermissions && (
        <button
          onClick={() => setPermissions(() => ({ allow: [], ask: [], deny: [] }))}
          className="self-start rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-1.5 text-xs font-medium text-ag-text-2 hover:text-ag-text-1 transition-colors"
        >
          {t('permissions.addPermissions')}
        </button>
      )}

      {hasPermissions && (
        <>
          {/* defaultMode */}
          <DefaultModeRow perms={perms} setPermissions={setPermissions} t={t} />

          {/* Allow / Ask / Deny */}
          {(['allow', 'ask', 'deny'] as const).map((section) => (
            <RuleSection
              key={section}
              section={section}
              rules={perms[section] ?? []}
              allRules={{ allow: perms.allow ?? [], deny: perms.deny ?? [] }}
              onAdd={(rule) => setPermissions((p) => ({ ...p, [section]: [...(p[section] ?? []), rule] }))}
              onRemove={(idx) => setPermissions((p) => {
                const arr = [...(p[section] ?? [])]
                arr.splice(idx, 1)
                return { ...p, [section]: arr }
              })}
              t={t}
            />
          ))}

          {/* additionalDirectories */}
          <AdditionalDirsSection
            dirs={perms.additionalDirectories ?? []}
            onAdd={(dir) => setPermissions((p) => ({ ...p, additionalDirectories: [...(p.additionalDirectories ?? []), dir] }))}
            onRemove={(idx) => setPermissions((p) => {
              const arr = [...(p.additionalDirectories ?? [])]
              arr.splice(idx, 1)
              return { ...p, additionalDirectories: arr }
            })}
            t={t}
          />
        </>
      )}

      {/* Raw edit link */}
      <button
        onClick={() => { setRawContent(JSON.stringify(settings, null, 2)); setShowRaw(true) }}
        className="self-start text-[11px] text-ag-text-3 underline underline-offset-2 hover:text-ag-text-2"
      >
        {t('permissions.editRaw')}
      </button>
    </div>
  )
}

// ── DefaultMode row ───────────────────────────────────────────────────────────

function DefaultModeRow({ perms, setPermissions, t }: {
  perms: Permissions
  setPermissions: (updater: (prev: Permissions) => Permissions) => void
  t: ReturnType<typeof useTranslation>['t']
}): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-medium text-ag-text-2">{t('permissions.sections.defaultMode')}</span>
      <select
        value={perms.defaultMode ?? ''}
        onChange={(e) => setPermissions((p) => {
          const val = e.target.value
          if (!val) {
            const { defaultMode: _dm, ...rest } = p
            return rest
          }
          return { ...p, defaultMode: val }
        })}
        className="rounded-lg border border-ag-border bg-ag-surface-2 px-2 py-1 text-xs text-ag-text-1 focus:border-accent-border focus:outline-none transition-colors"
      >
        <option value="">{t('permissions.defaultMode.unset')}</option>
        {DEFAULT_MODE_VALUES.map((v) => (
          <option key={v} value={v}>{t(`permissions.defaultMode.${v}`)}</option>
        ))}
      </select>
    </div>
  )
}

// ── Rule section ──────────────────────────────────────────────────────────────

interface RuleSectionProps {
  section: 'allow' | 'ask' | 'deny'
  rules: string[]
  allRules: { allow: string[]; deny: string[] }
  onAdd: (rule: string) => void
  onRemove: (idx: number) => void
  t: ReturnType<typeof useTranslation>['t']
}

const SECTION_COLORS = {
  allow: 'text-emerald-400 border-emerald-800/40',
  ask:   'text-yellow-400 border-yellow-800/40',
  deny:  'text-red-400 border-red-800/40',
}

function RuleSection({ section, rules, allRules, onAdd, onRemove, t }: RuleSectionProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)
  const [dupError, setDupError] = useState<string | null>(null)

  const colorClass = SECTION_COLORS[section]

  function handleAdd(rule: string): void {
    if (rules.includes(rule)) {
      setDupError(t('permissions.duplicateRule'))
      return
    }
    setDupError(null)
    setAdding(false)
    onAdd(rule)
  }

  // Warn if a deny rule also appears in allow
  function isDenyConflict(rule: string): boolean {
    if (section === 'allow') return allRules.deny.includes(rule)
    return false
  }

  return (
    <div className={cn('rounded-xl border', colorClass.split(' ')[1], 'border-ag-border bg-ag-surface-2')}>
      {/* Section header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <span className={cn('text-xs font-semibold uppercase tracking-wider', colorClass.split(' ')[0])}>
            {t(`permissions.sections.${section}`)}
          </span>
          <span className="ml-2 text-[10px] text-ag-text-3">
            {t(`permissions.sections.${section}Desc`)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-ag-surface px-1.5 py-0.5 text-[10px] font-mono text-ag-text-3">
            {rules.length}
          </span>
          {expanded ? <ChevronDown size={13} className="text-ag-text-3" /> : <ChevronRight size={13} className="text-ag-text-3" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-ag-border px-4 py-3 flex flex-col gap-2">
          {rules.length === 0 && !adding && (
            <p className="text-xs text-ag-text-3">{t('permissions.noRules')}</p>
          )}

          {rules.map((rule, idx) => (
            <div key={idx} className="group flex items-center gap-2">
              <RuleChip rule={rule} />
              {isDenyConflict(rule) && (
                <span className="text-[10px] text-yellow-400" title={t('permissions.denyOverridesAllow')}>⚠</span>
              )}
              <button
                onClick={() => onRemove(idx)}
                className="ml-auto rounded p-0.5 text-ag-text-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {dupError && <p className="text-xs text-red-400">{dupError}</p>}

          {adding ? (
            <AddRuleForm
              onAdd={handleAdd}
              onCancel={() => { setAdding(false); setDupError(null) }}
              t={t}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="self-start text-xs text-ag-text-3 hover:text-ag-text-1 transition-colors"
            >
              {t('permissions.addRule')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Rule chip ─────────────────────────────────────────────────────────────────

function RuleChip({ rule }: { rule: string }): JSX.Element {
  const { tool, specifier } = parseRule(rule)
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <span className={toolBadgeClass(tool)}>{tool === 'mcp__' ? 'MCP' : tool}</span>
      {specifier && <span className="text-ag-text-2">{specifier}</span>}
    </div>
  )
}

// ── Add rule form ─────────────────────────────────────────────────────────────

interface AddRuleFormProps {
  onAdd: (rule: string) => void
  onCancel: () => void
  t: ReturnType<typeof useTranslation>['t']
}

function AddRuleForm({ onAdd, onCancel, t }: AddRuleFormProps): JSX.Element {
  const [tool, setTool] = useState('Bash')
  const [specifier, setSpecifier] = useState('')
  const [mcpServer, setMcpServer] = useState('')
  const [mcpTool, setMcpTool] = useState('')
  const [pathPrefix, setPathPrefix] = useState<PathPrefix>('/')

  const toolDef = TOOLS.find((t) => t.id === tool) ?? TOOLS[0]

  function getBuiltRule(): string | null {
    if (toolDef.specifier === 'none') return tool
    if (toolDef.specifier === 'mcp') {
      if (!mcpServer.trim()) return null
      return `mcp__${mcpServer.trim()}${mcpTool.trim() ? `__${mcpTool.trim()}` : ''}`
    }
    if (toolDef.specifier === 'full-text') return specifier.trim() || null
    if (!specifier.trim()) return null
    return buildRule(tool, specifier.trim(), pathPrefix)
  }

  function handleSubmit(): void {
    const rule = getBuiltRule()
    if (!rule) return
    onAdd(rule)
  }

  async function handlePickFolder(): Promise<void> {
    const picked = await window.electronAPI.dialog.pickFolder()
    if (picked) setSpecifier(picked)
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-accent/20 bg-accent-surface px-3 py-3">
      {/* Tool selector */}
      <div className="flex items-center gap-2">
        <select
          value={tool}
          onChange={(e) => { setTool(e.target.value); setSpecifier(''); setMcpServer(''); setMcpTool('') }}
          className="rounded-lg border border-ag-border bg-ag-surface px-2 py-1 text-xs text-ag-text-1 focus:border-accent-border focus:outline-none"
        >
          {TOOLS.map((toolDef) => (
            <option key={toolDef.id} value={toolDef.id}>
              {t(`permissions.tools.${toolDef.id}`)}
            </option>
          ))}
        </select>
        {toolDef.specifier !== 'none' && <span className="text-xs text-ag-text-3">→</span>}
      </div>

      {/* Specifier input — context-aware */}
      {toolDef.specifier === 'free-text' && (
        <input
          autoFocus
          type="text"
          value={specifier}
          onChange={(e) => setSpecifier(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
          placeholder={t(`permissions.specifierPlaceholders.${tool}`)}
          className="rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
        />
      )}

      {toolDef.specifier === 'path' && (
        <div className="flex gap-2">
          <select
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value as PathPrefix)}
            className="rounded-lg border border-ag-border bg-ag-surface px-2 py-1 text-xs font-mono text-ag-text-1 focus:border-accent-border focus:outline-none"
          >
            {PATH_PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            autoFocus
            type="text"
            value={specifier}
            onChange={(e) => setSpecifier(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
            placeholder={t(`permissions.specifierPlaceholders.${tool}`)}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handlePickFolder()}
            title="Pick folder"
            className="rounded-lg border border-ag-border bg-ag-surface px-2 py-1 text-ag-text-3 hover:text-ag-text-1 transition-colors"
          >
            <FolderOpen size={13} />
          </button>
        </div>
      )}

      {toolDef.specifier === 'domain' && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-ag-text-3">domain:</span>
          <input
            autoFocus
            type="text"
            value={specifier}
            onChange={(e) => setSpecifier(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
            placeholder={t('permissions.specifierPlaceholders.WebFetch')}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
          />
        </div>
      )}

      {toolDef.specifier === 'mcp' && (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={mcpServer}
            onChange={(e) => setMcpServer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
            placeholder={t('permissions.specifierPlaceholders.mcp__server')}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
          />
          <input
            type="text"
            value={mcpTool}
            onChange={(e) => setMcpTool(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
            placeholder={t('permissions.specifierPlaceholders.mcp__tool')}
            className="flex-1 rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
          />
        </div>
      )}

      {toolDef.specifier === 'agent-name' && (
        <input
          autoFocus
          type="text"
          value={specifier}
          onChange={(e) => setSpecifier(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
          placeholder={t('permissions.specifierPlaceholders.Agent')}
          className="rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
        />
      )}

      {toolDef.specifier === 'full-text' && (
        <input
          autoFocus
          type="text"
          value={specifier}
          onChange={(e) => setSpecifier(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
          placeholder={t('permissions.specifierPlaceholders.custom')}
          className="rounded-lg border border-ag-border bg-ag-surface px-3 py-1.5 text-xs font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none"
        />
      )}

      {/* Rule preview */}
      {getBuiltRule() && (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ag-text-3">
          <span>→</span>
          <RuleChip rule={getBuiltRule()!} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={handleSubmit}
          disabled={!getBuiltRule()}
          className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          {t('common.add')}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-ag-border px-3 py-1 text-xs text-ag-text-2 hover:text-ag-text-1 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Additional directories section ────────────────────────────────────────────

interface AdditionalDirsSectionProps {
  dirs: string[]
  onAdd: (dir: string) => void
  onRemove: (idx: number) => void
  t: ReturnType<typeof useTranslation>['t']
}

function AdditionalDirsSection({ dirs, onAdd, onRemove, t }: AdditionalDirsSectionProps): JSX.Element {
  async function handlePick(): Promise<void> {
    const picked = await window.electronAPI.dialog.pickFolder()
    if (picked) onAdd(picked)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ag-text-2">{t('permissions.sections.additionalDirs')}</span>
      {dirs.length === 0 ? (
        <p className="text-xs text-ag-text-3">{t('permissions.noAdditionalDirs')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {dirs.map((dir, idx) => (
            <div key={idx} className="group flex items-center gap-1.5 rounded-full border border-ag-border bg-ag-surface-2 px-3 py-1">
              <span className="font-mono text-[11px] text-ag-text-2">{dir}</span>
              <button
                onClick={() => onRemove(idx)}
                className="text-ag-text-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => void handlePick()}
        className="flex items-center gap-1.5 self-start rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-1.5 text-xs font-medium text-ag-text-2 hover:text-ag-text-1 transition-colors"
      >
        <Plus size={12} />
        {t('permissions.addDirectory')}
      </button>
    </div>
  )
}
