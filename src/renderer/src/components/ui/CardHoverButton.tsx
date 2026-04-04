import { cn } from '../../lib/utils'

interface CardHoverButtonProps {
  onClick: (e: React.MouseEvent) => void
  label: string
  color?: 'indigo' | 'emerald'
}

export function CardHoverButton({ onClick, label, color = 'indigo' }: CardHoverButtonProps): JSX.Element {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      className={cn(
        'absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100',
        color === 'indigo' ? 'bg-indigo-600/90' : 'bg-emerald-700/90'
      )}
    >
      {label}
    </button>
  )
}
