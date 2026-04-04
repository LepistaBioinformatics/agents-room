import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  children: string
  className?: string
}

export function MarkdownContent({
  children,
  className
}: MarkdownContentProps): JSX.Element {
  const components = React.useMemo(
    () => ({
      h1: ({ children: c }: { children?: React.ReactNode }) => (
        <h1 className="mb-3 mt-5 text-base font-bold first:mt-0 text-ag-text-1">{c}</h1>
      ),
      h2: ({ children: c }: { children?: React.ReactNode }) => (
        <h2 className="mb-2 mt-4 text-sm font-semibold text-ag-text-1 first:mt-0">{c}</h2>
      ),
      h3: ({ children: c }: { children?: React.ReactNode }) => (
        <h3 className="mb-2 mt-3 text-sm font-medium text-ag-text-1 first:mt-0">{c}</h3>
      ),
      p: ({ children: c }: { children?: React.ReactNode }) => (
        <p className="mb-3 text-sm leading-relaxed text-ag-text-1 last:mb-0">{c}</p>
      ),
      ul: ({ children: c }: { children?: React.ReactNode }) => (
        <ul className="mb-3 space-y-1 pl-4 last:mb-0">{c}</ul>
      ),
      ol: ({ children: c }: { children?: React.ReactNode }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-4 last:mb-0">{c}</ol>
      ),
      li: ({ children: c }: { children?: React.ReactNode }) => (
        <li className="text-sm text-ag-text-1 marker:text-ag-text-3">{c}</li>
      ),
      code: ({ inline, children: c }: { inline?: boolean; children?: React.ReactNode }) =>
        inline ? (
          <code className="rounded px-1.5 py-0.5 text-[11px] font-mono border bg-accent-surface text-accent border-accent-border">
            {c}
          </code>
        ) : (
          <code className="block">{c}</code>
        ),
      pre: ({ children: c }: { children?: React.ReactNode }) => (
        <pre className="mb-3 overflow-x-auto rounded-lg border border-ag-border bg-ag-bg/80 px-4 py-3 text-[11px] font-mono text-ag-text-1 last:mb-0">
          {c}
        </pre>
      ),
      blockquote: ({ children: c }: { children?: React.ReactNode }) => (
        <blockquote className="mb-3 border-l-2 border-accent-border pl-3 text-sm italic text-ag-text-2 last:mb-0">
          {c}
        </blockquote>
      ),
      hr: () => <hr className="my-4 border-ag-border" />,
      strong: ({ children: c }: { children?: React.ReactNode }) => (
        <strong className="font-semibold text-ag-text-1">{c}</strong>
      ),
      em: ({ children: c }: { children?: React.ReactNode }) => (
        <em className="italic text-ag-text-1">{c}</em>
      ),
      a: ({ href, children: c }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          className="underline text-accent decoration-accent-border hover:text-accent/80"
          target="_blank"
          rel="noreferrer"
        >
          {c}
        </a>
      ),
      table: ({ children: c }: { children?: React.ReactNode }) => (
        <div className="mb-3 overflow-x-auto rounded-lg border border-ag-border last:mb-0">
          <table className="w-full text-sm border-collapse">{c}</table>
        </div>
      ),
      thead: ({ children: c }: { children?: React.ReactNode }) => (
        <thead className="border-b border-ag-border bg-ag-surface">{c}</thead>
      ),
      tbody: ({ children: c }: { children?: React.ReactNode }) => (
        <tbody className="divide-y divide-ag-border">{c}</tbody>
      ),
      th: ({ children: c }: { children?: React.ReactNode }) => (
        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-ag-text-2">
          {c}
        </th>
      ),
      td: ({ children: c }: { children?: React.ReactNode }) => (
        <td className="px-3 py-2 text-sm text-ag-text-1">{c}</td>
      ),
      tr: ({ children: c }: { children?: React.ReactNode }) => (
        <tr className="hover:bg-ag-surface-2/40">{c}</tr>
      )
    }),
    []
  )

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components as Record<string, React.ComponentType<unknown>>}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
