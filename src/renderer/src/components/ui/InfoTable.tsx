import { cn } from '../../lib/utils'

interface InfoTableRow {
  key: string
  value: React.ReactNode
  mono?: boolean
}

interface InfoTableProps {
  rows: InfoTableRow[]
}

export function InfoTable({ rows }: InfoTableProps): JSX.Element {
  return (
    <div className="border border-t-2 border-ag-border border-t-zinc-500/60 bg-ag-surface-2 divide-y divide-ag-border overflow-hidden">
      {rows.map(({ key, value, mono }) => (
        <div key={key} className="flex gap-4 px-4 py-2.5 text-xs">
          <span className="w-32 shrink-0 font-mono text-ag-text-3">{key}</span>
          <span className={cn('break-all', mono ? 'font-mono text-ag-text-2' : 'text-ag-text-2')}>{value}</span>
        </div>
      ))}
    </div>
  )
}
