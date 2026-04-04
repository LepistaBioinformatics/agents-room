import { cn } from '../../lib/utils'

interface SectionBlockProps {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  noBorder?: boolean
}

export function SectionBlock({ icon, label, children, noBorder }: SectionBlockProps): JSX.Element {
  return (
    <div className={cn('px-6 py-5', !noBorder && 'border-b border-ag-border')}>
      <div className="flex items-center gap-2">
        <span className="text-ag-text-2">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{label}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
