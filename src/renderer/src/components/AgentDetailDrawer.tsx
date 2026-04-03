import { useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X, Save, FileText, Wrench, GitBranch, Database, StickyNote, Tag } from 'lucide-react'
import { AgentView, AgentMeta } from '../types/agent'
import { cn } from '../lib/utils'
import { AvatarImg } from './AvatarImg'
import { typeBadge } from '../lib/variants'

interface Props {
  agent: AgentView | null
  onClose: () => void
  onSaveMeta: (agentName: string, sourcePath: string, meta: Partial<AgentMeta>) => Promise<void>
}

const MODEL_LABEL: Record<string, string> = {
  opus: 'Claude Opus',
  sonnet: 'Claude Sonnet',
  haiku: 'Claude Haiku'
}

function modelLabel(model: string | null): string {
  if (!model) return 'default'
  const key = Object.keys(MODEL_LABEL).find((k) => model.toLowerCase().includes(k))
  return key ? MODEL_LABEL[key] : model
}

// Markdown component overrides for dark theme
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-5 text-base font-bold text-white first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-4 text-sm font-semibold text-ag-text-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-3 text-sm font-medium text-ag-text-1 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-ag-text-1 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm text-ag-text-1 marker:text-ag-text-3">{children}</li>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code className="rounded bg-indigo-950/60 px-1.5 py-0.5 text-[11px] font-mono text-indigo-300 border border-indigo-900/40">
        {children}
      </code>
    ) : (
      <code className="block">{children}</code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-ag-border bg-ag-bg/80 px-4 py-3 text-[11px] font-mono text-ag-text-1 last:mb-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-indigo-500/40 pl-3 text-sm italic text-ag-text-2 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-ag-border" />,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-ag-text-1">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-indigo-400 underline decoration-indigo-500/40 hover:text-indigo-300" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-ag-border last:mb-0">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="border-b border-ag-border bg-ag-surface">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ag-text-2">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t border-ag-border px-3 py-2 text-ag-text-1">{children}</td>
  )
}

export function AgentDetailDrawer({ agent, onClose, onSaveMeta }: Props): JSX.Element | null {
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!agent) return
    setNotes(agent.meta?.notes ?? '')
    setTags(agent.meta?.tags ?? [])
    setAvatarPath(agent.meta?.avatarPath)
    setSaved(false)
    setTagInput('')
  }, [agent])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = useCallback(async () => {
    if (!agent) return
    setSaving(true)
    await onSaveMeta(agent.name, agent.filePath, { notes, tags, avatarPath })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [agent, notes, tags, avatarPath, onSaveMeta])

  const addTag = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim()
      if (!tags.includes(newTag)) setTags((prev) => [...prev, newTag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string): void => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handlePickAvatar = async (): Promise<void> => {
    const path = await window.electronAPI.avatar.pick()
    if (path) setAvatarPath(path)
  }

  if (!agent) return null

  const extraFrontmatter = Object.entries(agent.frontmatter).filter(
    ([key]) => !['name', 'description', 'model', 'tools'].includes(key)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        style={{ zIndex: 40 }}
        onClick={onClose}
      />

      {/* Drawer — wide */}
      <div
        className="fixed right-0 top-0 flex h-full w-[640px] flex-col bg-ag-surface border-l border-ag-border/80 shadow-2xl animate-slide-in overflow-hidden"
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <button
              onClick={handlePickAvatar}
              title="Change avatar"
              className="shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
            >
              <AvatarImg path={avatarPath} size={48} rounded="xl" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={cn('rounded-md', typeBadge({ kind: agent.source === 'global' ? 'global' : 'workspace' }))}>
                  {agent.source}
                </span>
                {agent.model && (
                  <span className="rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-1">
                    {modelLabel(agent.model)}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-ag-text-1 tracking-tight leading-tight">{agent.name}</h2>
              {agent.description && (
                <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tags section */}
          <div className="border-b border-ag-border px-6 py-5">
            <SectionHeader icon={<Tag size={13} />} label="Tags" />
            <div className="mt-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 rounded-full bg-indigo-900/30 border border-indigo-800/40 px-2.5 py-1 text-xs text-indigo-300"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-indigo-400/60 hover:text-indigo-300 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tag and press Enter…"
                className="w-full rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Tools section */}
          {agent.tools.length > 0 && (
            <div className="border-b border-ag-border px-6 py-5">
              <SectionHeader icon={<Wrench size={13} />} label="Tools" />
              <div className="flex flex-wrap gap-2 mt-3">
                {agent.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-lg bg-ag-surface-2 border border-ag-border px-3 py-1.5 text-xs font-mono text-ag-text-1"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {(agent.mentions.length > 0 || agent.mentionedBy.length > 0) && (
            <div className="border-b border-ag-border px-6 py-5">
              <SectionHeader icon={<GitBranch size={13} />} label="Relationships" />
              <div className="mt-3 space-y-2">
                {agent.mentions.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 mt-0.5">mentions →</span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.mentions.map((name) => (
                        <span key={name} className="rounded-md bg-ag-surface-2/60 border border-ag-border px-2 py-0.5 text-xs text-ag-text-1">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {agent.mentionedBy.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded bg-ag-surface-2 px-2 py-0.5 text-[10px] text-ag-text-3 mt-0.5">← referenced by</span>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.mentionedBy.map((name) => (
                        <span key={name} className="rounded-md bg-ag-surface-2/60 border border-ag-border px-2 py-0.5 text-xs text-ag-text-1">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extra frontmatter */}
          {extraFrontmatter.length > 0 && (
            <div className="border-b border-ag-border px-6 py-5">
              <SectionHeader icon={<Database size={13} />} label="Metadata" />
              <div className="mt-3 rounded-xl border border-ag-border bg-ag-surface-2 divide-y divide-ag-border/60 overflow-hidden">
                {extraFrontmatter.map(([key, value]) => (
                  <div key={key} className="flex gap-4 px-4 py-2.5 text-xs">
                    <span className="w-32 shrink-0 font-mono text-ag-text-3">{key}</span>
                    <span className="text-ag-text-1 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
                <div className="flex gap-4 px-4 py-2.5 text-xs">
                  <span className="w-32 shrink-0 font-mono text-ag-text-3">path</span>
                  <span className="text-ag-text-3 break-all text-[10px]">{agent.filePath}</span>
                </div>
              </div>
            </div>
          )}

          {/* Agent prompt body */}
          {agent.body.trim() && (
            <div className="border-b border-ag-border px-6 py-5">
              <SectionHeader icon={<FileText size={13} />} label="Prompt" />
              <div className="mt-3 rounded-xl border border-ag-border bg-ag-surface-2 px-5 py-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents as Record<string, React.ComponentType<unknown>>}
                >
                  {agent.body}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={<StickyNote size={13} />} label="Notes" />
              <span className="text-[10px] text-ag-text-3">Stored in ~/.agents-room — not in agent file</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes, context, or observations about this agent…"
              rows={5}
              className="w-full resize-none rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className={[
                'mt-2.5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                saved
                  ? 'bg-emerald-700/80 text-emerald-100'
                  : 'bg-indigo-600/90 text-white hover:bg-indigo-600 disabled:opacity-50'
              ].join(' ')}
            >
              <Save size={13} />
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ag-text-2">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{label}</span>
    </div>
  )
}
