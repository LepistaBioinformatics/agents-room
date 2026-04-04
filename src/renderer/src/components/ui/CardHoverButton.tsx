import { cn } from '../../lib/utils'

interface CardHoverButtonProps {
  onClick: (e: React.MouseEvent) => void
  label: string
  className?: string
}

export function CardHoverButton({ onClick, label, className }: CardHoverButtonProps): JSX.Element {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      className={cn(
        'absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100',
        'bg-accent/90',
        className
      )}
    >
      {label}
    </button>
  )
}
