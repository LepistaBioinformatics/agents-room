import { cva } from 'class-variance-authority'

/**
 * Type badge — used on cards and drawers for agent/skill/command/source labels.
 */
export const typeBadge = cva(
  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
  {
    variants: {
      kind: {
        agent:     'border-indigo-700/50 bg-indigo-900/40 text-indigo-300',
        skill:     'border-emerald-700/50 bg-emerald-900/40 text-emerald-300',
        command:   'border-amber-700/50 bg-amber-900/40 text-amber-300',
        global:    'border-emerald-700/50 bg-emerald-900/40 text-emerald-300',
        workspace: 'border-amber-700/50 bg-amber-900/40 text-amber-300',
      },
      model: {
        opus:    'border-purple-600/40 bg-purple-900/70 text-purple-300',
        sonnet:  'border-indigo-600/40 bg-indigo-900/70 text-indigo-300',
        haiku:   'border-cyan-600/40 bg-cyan-900/70 text-cyan-300',
        default: 'border-zinc-600/40 bg-zinc-800 text-zinc-400',
      }
    }
  }
)

/**
 * Card shell — outer container for agent / skill / command cards.
 */
export const cardShell = cva(
  'relative flex flex-col rounded-xl border shadow-md select-none transition-all duration-150',
  {
    variants: {
      kind: {
        agent:   'bg-ag-card border-zinc-700/50 hover:border-zinc-500/70',
        skill:   'bg-ag-card-skill border-emerald-900/40 hover:border-emerald-700/50',
        command: 'bg-ag-card-cmd border-amber-900/30 hover:border-amber-700/40',
      },
      selected: {
        true:  '',
        false: '',
      }
    },
    compoundVariants: [
      { kind: 'agent',   selected: true,  class: 'border-indigo-500/80 ring-2 ring-indigo-500/30' },
      { kind: 'skill',   selected: true,  class: 'border-emerald-500/70 ring-2 ring-emerald-500/30' },
      { kind: 'command', selected: false, class: '' },
    ],
    defaultVariants: { selected: false }
  }
)
