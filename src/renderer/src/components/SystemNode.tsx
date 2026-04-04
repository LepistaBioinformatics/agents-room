import { useTranslation } from 'react-i18next'

interface Props {
  agentCount: number
  style?: React.CSSProperties
}

export function SystemNode({ agentCount, style }: Props): JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      style={style}
      className="absolute flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/90 to-purple-950/90 px-6 py-4 shadow-xl shadow-indigo-950/50 backdrop-blur-sm select-none"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.7" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="12" cy="5" r="1.5" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-bold text-white tracking-tight">{t('system.claudeCode')}</div>
        <div className="text-xs text-indigo-400/70">
          {t('system.agentCount', { count: agentCount })}
        </div>
      </div>
    </div>
  )
}
