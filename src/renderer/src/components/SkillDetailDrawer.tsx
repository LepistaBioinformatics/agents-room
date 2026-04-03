import { useEffect } from 'react'
import { X, FileText, Wrench, Cpu } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { SkillItem } from '../types/agent'
import { typeBadge } from '../lib/variants'
import { cn } from '../lib/utils'

interface Props {
  skill: SkillItem | null
  onClose: () => void
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ag-text-2">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{label}</span>
    </div>
  )
}

const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-5 text-base font-bold text-ag-text-1 first:mt-0">{children}</h1>
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
      <code className="rounded bg-emerald-950/40 px-1.5 py-0.5 text-[11px] font-mono text-emerald-300 border border-emerald-900/40">
        {children}
      </code>
    ) : (
      <code className="block">{children}</code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-ag-border bg-ag-bg px-4 py-3 text-[11px] font-mono text-ag-text-1 last:mb-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-emerald-500/40 pl-3 text-sm italic text-ag-text-2 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-ag-border" />,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-ag-text-1">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-emerald-400 underline decoration-emerald-500/40 hover:text-emerald-300" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

export function SkillDetailDrawer({ skill, onClose }: Props): JSX.Element | null {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!skill) return null

  const folderName = skill.folderPath.split('/').pop() ?? skill.folderPath

  return (
    <>
      <div className="fixed inset-0 bg-black/50 animate-fade-in" style={{ zIndex: 40 }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 flex h-full w-[580px] flex-col bg-ag-surface border-l border-ag-border shadow-2xl animate-slide-in overflow-hidden"
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn('rounded-md', typeBadge({ kind: 'skill' }))}>skill</span>
              <span className={cn('rounded-md', typeBadge({ kind: skill.source === 'global' ? 'global' : 'workspace' }))}>
                {skill.source}
              </span>
              {skill.model && (
                <span className="rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-1">
                  {skill.model}
                </span>
              )}
              {skill.disableModelInvocation && (
                <span className="flex items-center gap-1 rounded-md bg-ag-surface-2 border border-ag-border px-2 py-0.5 text-[11px] text-ag-text-2">
                  <Cpu size={10} /> no model
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wide text-ag-text-1 leading-tight">{skill.name}</h2>
            {skill.description && (
              <p className="mt-1 text-xs text-ag-text-2 leading-relaxed line-clamp-2">{skill.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Metadata */}
          <div className="border-b border-ag-border px-6 py-5">
            <SectionHeader icon={<Wrench size={13} />} label="Info" />
            <div className="mt-3 rounded-xl border border-ag-border bg-ag-surface-2 divide-y divide-ag-border overflow-hidden">
              <div className="flex gap-4 px-4 py-2.5 text-xs">
                <span className="w-32 shrink-0 font-mono text-ag-text-3">folder</span>
                <span className="font-mono text-ag-text-2">{folderName}</span>
              </div>
              <div className="flex gap-4 px-4 py-2.5 text-xs">
                <span className="w-32 shrink-0 font-mono text-ag-text-3">path</span>
                <span className="text-ag-text-3 break-all text-[10px]">{skill.folderPath}</span>
              </div>
              {skill.workspacePath && (
                <div className="flex gap-4 px-4 py-2.5 text-xs">
                  <span className="w-32 shrink-0 font-mono text-ag-text-3">workspace</span>
                  <span className="text-ag-text-3 break-all text-[10px]">{skill.workspacePath}</span>
                </div>
              )}
            </div>
          </div>

          {/* SKILL.md body */}
          {skill.body.trim() && (
            <div className="px-6 py-5">
              <SectionHeader icon={<FileText size={13} />} label="Prompt" />
              <div className="mt-3 rounded-xl border border-ag-border bg-ag-surface-2 px-5 py-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents as Record<string, React.ComponentType<unknown>>}
                >
                  {skill.body}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!skill.body.trim() && (
            <div className="px-6 py-5 text-sm text-ag-text-3">No prompt body found in SKILL.md.</div>
          )}
        </div>
      </div>
    </>
  )
}
