import { useEffect, useState, useCallback } from 'react'
import { X, Settings, KeyRound, CheckCircle2, Github, ExternalLink } from 'lucide-react'
import { DrawerShell } from './ui/DrawerShell'
import type { AppSettings } from '../types/agent'

interface Props {
  onClose: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsDrawer({ onClose }: Props): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({})
  const [geminiInput, setGeminiInput] = useState('')
  const [geminiSaveState, setGeminiSaveState] = useState<SaveState>('idle')
  const [anthropicInput, setAnthropicInput] = useState('')
  const [anthropicSaveState, setAnthropicSaveState] = useState<SaveState>('idle')
  const [githubConfigured, setGithubConfigured] = useState(false)
  const [githubMasked, setGithubMasked] = useState<string | null>(null)
  const [githubInput, setGithubInput] = useState('')
  const [githubSaveState, setGithubSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    window.electronAPI.appSettings.get().then((s) => {
      setSettings(s)
    })
    window.electronAPI.settings.getGitHubToken().then(({ configured, masked }) => {
      setGithubConfigured(configured)
      setGithubMasked(masked)
    })
  }, [])

  const handleSaveGemini = useCallback(async () => {
    if (!geminiInput.trim()) return
    setGeminiSaveState('saving')
    const result = await window.electronAPI.appSettings.set({ geminiApiKey: geminiInput.trim() })
    if (result.error) {
      setGeminiSaveState('error')
    } else {
      setSettings((prev) => ({ ...prev, geminiApiKey: geminiInput.trim() }))
      setGeminiInput('')
      setGeminiSaveState('saved')
      setTimeout(() => setGeminiSaveState('idle'), 2000)
    }
  }, [geminiInput])

  const handleClearGemini = useCallback(async () => {
    await window.electronAPI.appSettings.set({ geminiApiKey: '' })
    setSettings((prev) => ({ ...prev, geminiApiKey: undefined }))
    setGeminiInput('')
    setGeminiSaveState('idle')
  }, [])

  const handleSaveAnthropic = useCallback(async () => {
    if (!anthropicInput.trim()) return
    setAnthropicSaveState('saving')
    const result = await window.electronAPI.appSettings.set({ anthropicApiKey: anthropicInput.trim() })
    if (result.error) {
      setAnthropicSaveState('error')
    } else {
      setSettings((prev) => ({ ...prev, anthropicApiKey: anthropicInput.trim() }))
      setAnthropicInput('')
      setAnthropicSaveState('saved')
      setTimeout(() => setAnthropicSaveState('idle'), 2000)
    }
  }, [anthropicInput])

  const handleClearAnthropic = useCallback(async () => {
    await window.electronAPI.appSettings.set({ anthropicApiKey: '' })
    setSettings((prev) => ({ ...prev, anthropicApiKey: undefined }))
    setAnthropicInput('')
    setAnthropicSaveState('idle')
  }, [])

  const handleSaveGithub = useCallback(async () => {
    if (!githubInput.trim()) return
    setGithubSaveState('saving')
    const result = await window.electronAPI.settings.setGitHubToken(githubInput.trim())
    if (result.error) {
      setGithubSaveState('error')
    } else {
      const status = await window.electronAPI.settings.getGitHubToken()
      setGithubConfigured(status.configured)
      setGithubMasked(status.masked)
      setGithubInput('')
      setGithubSaveState('saved')
      setTimeout(() => setGithubSaveState('idle'), 2000)
    }
  }, [githubInput])

  const handleClearGithub = useCallback(async () => {
    await window.electronAPI.settings.clearGitHubToken()
    setGithubConfigured(false)
    setGithubMasked(null)
    setGithubInput('')
    setGithubSaveState('idle')
  }, [])

  const bothConfigured = !!settings.geminiApiKey && !!settings.anthropicApiKey

  return (
    <DrawerShell onClose={onClose} width="w-[90%] sm:w-[420px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ag-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-ag-text-2" />
          <h2 className="text-sm font-semibold text-ag-text-1">Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Section: AI & APIs */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <KeyRound size={13} className="text-ag-text-3" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">AI &amp; APIs</h3>
          </div>

          {bothConfigured && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3.5 py-2 text-xs text-emerald-300">
              <CheckCircle2 size={13} />
              Both API integrations ready
            </div>
          )}

          {/* Gemini API Key */}
          <div className="space-y-3 rounded-lg border border-ag-border bg-ag-surface-2/50 px-4 py-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                Google Gemini API Key
              </label>
              {settings.geminiApiKey && (
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Configured
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-ag-text-3">
              Required for AI image generation (avatars &amp; card backgrounds).
            </p>
            <ol className="space-y-1 text-[11px] leading-relaxed text-ag-text-3 list-decimal list-inside">
              <li>Access <button onClick={() => window.electronAPI.app.openExternal('https://aistudio.google.com/apikey')} className="text-accent hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink size={10} /></button></li>
              <li>Click <span className="font-medium text-ag-text-2">Get API key</span> and create or select a project</li>
              <li>Copy the key and paste it below</li>
            </ol>
            <input
              type="password"
              value={geminiInput}
              onChange={(e) => { setGeminiInput(e.target.value); setGeminiSaveState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGemini() }}
              placeholder="AIza..."
              autoComplete="off"
              className="w-full rounded-lg border border-ag-border bg-ag-surface px-3 py-2 font-mono text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
            />
            {geminiSaveState === 'error' && (
              <p className="text-xs text-red-400">Failed to save. Check file permissions.</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveGemini}
                disabled={!geminiInput.trim() || geminiSaveState === 'saving'}
                className={[
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  geminiSaveState === 'saved'
                    ? 'bg-emerald-700/80 text-emerald-100'
                    : 'bg-accent/90 text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed'
                ].join(' ')}
              >
                {geminiSaveState === 'saving' ? 'Saving…' : geminiSaveState === 'saved' ? 'Saved ✓' : 'Save'}
              </button>
              {settings.geminiApiKey && (
                <button
                  onClick={handleClearGemini}
                  className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-3 rounded-lg border border-ag-border bg-ag-surface-2/50 px-4 py-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                Anthropic API Key
              </label>
              {settings.anthropicApiKey && (
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Configured
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-ag-text-3">
              Required for AI-assisted agent, skill, and command creation.
            </p>
            <ol className="space-y-1 text-[11px] leading-relaxed text-ag-text-3 list-decimal list-inside">
              <li>Access <button onClick={() => window.electronAPI.app.openExternal('https://console.anthropic.com/settings/keys')} className="text-accent hover:underline inline-flex items-center gap-0.5">Anthropic Console <ExternalLink size={10} /></button></li>
              <li>Click <span className="font-medium text-ag-text-2">Create Key</span> and set a name</li>
              <li>Copy the key and paste it below — it won't be shown again</li>
            </ol>
            <input
              type="password"
              value={anthropicInput}
              onChange={(e) => { setAnthropicInput(e.target.value); setAnthropicSaveState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAnthropic() }}
              placeholder="sk-ant-..."
              autoComplete="off"
              className="w-full rounded-lg border border-ag-border bg-ag-surface px-3 py-2 font-mono text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
            />
            {anthropicSaveState === 'error' && (
              <p className="text-xs text-red-400">Failed to save. Check file permissions.</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAnthropic}
                disabled={!anthropicInput.trim() || anthropicSaveState === 'saving'}
                className={[
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  anthropicSaveState === 'saved'
                    ? 'bg-emerald-700/80 text-emerald-100'
                    : 'bg-accent/90 text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed'
                ].join(' ')}
              >
                {anthropicSaveState === 'saving' ? 'Saving…' : anthropicSaveState === 'saved' ? 'Saved ✓' : 'Save'}
              </button>
              {settings.anthropicApiKey && (
                <button
                  onClick={handleClearAnthropic}
                  className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section: Integrations */}
        <div className="mt-8 space-y-5">
          <div className="flex items-center gap-2">
            <Github size={13} className="text-ag-text-3" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">Integrations</h3>
          </div>

          {/* GitHub Token */}
          <div className="space-y-3 rounded-lg border border-ag-border bg-ag-surface-2/50 px-4 py-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-2">
                GitHub Token
              </label>
              {githubConfigured && (
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Configured
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-ag-text-3">
              Required for installing skills from private repositories and avoiding GitHub API rate limits.
            </p>
            <ol className="space-y-1 text-[11px] leading-relaxed text-ag-text-3 list-decimal list-inside">
              <li>Access <button onClick={() => window.electronAPI.app.openExternal('https://github.com/settings/tokens/new?scopes=repo,read:org&description=Agents+Room')} className="text-accent hover:underline inline-flex items-center gap-0.5">GitHub → New token (classic) <ExternalLink size={10} /></button></li>
              <li>Select scopes: <span className="font-mono font-medium text-ag-text-2">repo</span> (for private repos) or no scopes for public only</li>
              <li>Click <span className="font-medium text-ag-text-2">Generate token</span>, copy and paste below</li>
            </ol>
            {githubMasked && (
              <p className="font-mono text-[11px] text-ag-text-3 truncate">{githubMasked}</p>
            )}
            <input
              type="password"
              value={githubInput}
              onChange={(e) => { setGithubInput(e.target.value); setGithubSaveState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGithub() }}
              placeholder="ghp_..."
              autoComplete="off"
              className="w-full rounded-lg border border-ag-border bg-ag-surface px-3 py-2 font-mono text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
            />
            {githubSaveState === 'error' && (
              <p className="text-xs text-red-400">Failed to save. Check file permissions.</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveGithub}
                disabled={!githubInput.trim() || githubSaveState === 'saving'}
                className={[
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  githubSaveState === 'saved'
                    ? 'bg-emerald-700/80 text-emerald-100'
                    : 'bg-accent/90 text-white hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed'
                ].join(' ')}
              >
                {githubSaveState === 'saving' ? 'Saving…' : githubSaveState === 'saved' ? 'Saved ✓' : 'Save'}
              </button>
              {githubConfigured && (
                <button
                  onClick={handleClearGithub}
                  className="rounded-lg border border-red-800/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DrawerShell>
  )
}
