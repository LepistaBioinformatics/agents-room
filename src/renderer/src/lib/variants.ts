import { cva } from 'class-variance-authority'

/**
 * Type badge — used on cards and drawers for agent/skill/command/source labels.
 */
export const typeBadge = cva(
  'inline-flex items-center border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
  {
    variants: {
      kind: {
        agent:     'border-accent/50 bg-accent-surface text-accent',
        skill:     'border-emerald-700/50 bg-emerald-900/40 text-emerald-300',
        command:   'border-amber-700/50 bg-amber-900/40 text-amber-300',
        global:    'border-emerald-700/50 bg-emerald-900/40 text-emerald-300',
        workspace: 'border-amber-700/50 bg-amber-900/40 text-amber-300',
      },
      model: {
        opus:    'border-purple-600/40 bg-purple-900/70 text-purple-300',
        sonnet:  'border-accent/40 bg-accent-surface text-accent',
        haiku:   'border-cyan-600/40 bg-cyan-900/70 text-cyan-300',
        default: 'border-zinc-600/40 bg-zinc-800 text-zinc-400',
      }
    }
  }
)

/**
 * Card shell — outer container for agent / skill / command cards.
 * Straight-edge design: thick accent border on top, thin border on sides and bottom.
 */
export const cardShell = cva(
  'relative flex flex-col border border-t-2 select-none transition-all duration-150',
  {
    variants: {
      kind: {
        agent:   'bg-ag-card   border-zinc-700/50     border-t-accent/70      hover:border-zinc-500/60   hover:border-t-accent/90',
        skill:   'bg-ag-card-skill border-emerald-900/50 border-t-emerald-500/70 hover:border-emerald-700/60 hover:border-t-emerald-400/90',
        command: 'bg-ag-card-cmd  border-amber-900/40  border-t-amber-500/60   hover:border-amber-700/50  hover:border-t-amber-400/80',
      },
      selected: {
        true:  '',
        false: '',
      }
    },
    compoundVariants: [
      { kind: 'agent',   selected: true, class: 'border-zinc-600/70 border-t-accent ring-1 ring-accent/25' },
      { kind: 'skill',   selected: true, class: 'border-emerald-700/60 border-t-emerald-400 ring-1 ring-emerald-500/25' },
      { kind: 'command', selected: true, class: 'border-amber-700/50 border-t-amber-400 ring-1 ring-amber-500/25' },
    ],
    defaultVariants: { selected: false }
  }
)

/**
 * Trust tier badge — shown on skill cards and detail drawer for installed skills.
 */
export const trustBadge = cva('px-2 py-0.5 text-[11px] font-medium border', {
  variants: {
    tier: {
      trusted:      'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
      'user-trusted': 'bg-sky-950/40   border-sky-800/40   text-sky-300',
      known:        'bg-yellow-950/40  border-yellow-800/40  text-yellow-300',
      unknown:      'bg-red-950/40     border-red-800/40     text-red-300',
      local:        'bg-ag-surface-2   border-ag-border       text-ag-text-3',
    }
  },
  defaultVariants: { tier: 'local' }
})
