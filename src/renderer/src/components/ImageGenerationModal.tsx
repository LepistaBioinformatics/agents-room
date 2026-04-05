import { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { X, Wand2, RefreshCw, Loader2, Settings } from 'lucide-react'

interface Props {
  agentName: string
  agentDescription?: string
  agentTools?: string[]
  type: 'avatar' | 'background'
  onClose: () => void
  onConfirm: (imagePath: string) => void
  onOpenSettings?: () => void
}

type GenState = 'idle' | 'generating' | 'done' | 'error'

function buildAutoPrompt(
  agentName: string,
  agentDescription: string | undefined,
  agentTools: string[] | undefined,
  type: 'avatar' | 'background'
): string {
  const subject = type === 'avatar' ? 'avatar/logo' : 'card background'
  const toolsPart = agentTools?.length ? `. Tools: ${agentTools.slice(0, 3).join(', ')}` : ''
  const descPart = agentDescription ? `, ${agentDescription}` : ''
  return `Professional AI agent ${subject} for "${agentName}"${descPart}${toolsPart}. Style: minimal, dark theme, professional.`
}

export function ImageGenerationModal({
  agentName,
  agentDescription,
  agentTools,
  type,
  onClose,
  onConfirm,
  onOpenSettings
}: Props): JSX.Element {
  const [prompt, setPrompt] = useState(() =>
    buildAutoPrompt(agentName, agentDescription, agentTools, type)
  )
  const [genState, setGenState] = useState<GenState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    setGenState('generating')
    setError(null)
    setIsApiKeyMissing(false)
    setPreviewUrl(null)
    setImagePath(null)

    const result = type === 'avatar'
      ? await window.electronAPI.image.generateAvatar({ prompt: prompt.trim() })
      : await window.electronAPI.image.generateBackground({ prompt: prompt.trim() })

    if (!result.success || !result.imagePath) {
      if (result.error === 'API_KEY_NOT_CONFIGURED') {
        setIsApiKeyMissing(true)
        setError('Gemini API key not configured.')
      } else {
        setError(mapErrorCode(result.error))
      }
      setGenState('error')
      return
    }

    // Load preview via avatar:read IPC (returns data URL)
    const dataUrl = await window.electronAPI.avatar.read(result.imagePath)
    setImagePath(result.imagePath)
    setPreviewUrl(dataUrl)
    setGenState('done')
  }, [prompt, type])

  const handleConfirm = (): void => {
    if (imagePath) {
      onConfirm(imagePath)
    }
  }

  const title = type === 'avatar' ? 'Generate Avatar' : 'Generate Card Background'

  const modal = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] border border-t-2 border-ag-border border-t-zinc-500/60 bg-ag-surface shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-ag-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Wand2 size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-ag-text-1">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-2"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Prompt field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ag-text-3">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              placeholder="Describe the image you want to generate…"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || genState === 'generating'}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent/90 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {genState === 'generating' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 size={14} />
                Generate
              </>
            )}
          </button>

          {/* Error */}
          {genState === 'error' && error && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3.5 py-3 text-xs text-red-300">
              {error}
              {isApiKeyMissing && onOpenSettings && (
                <button
                  onClick={() => { onClose(); onOpenSettings() }}
                  className="ml-2 inline-flex items-center gap-1 text-accent underline underline-offset-2 hover:no-underline"
                >
                  <Settings size={11} />
                  Open Settings
                </button>
              )}
            </div>
          )}

          {/* Preview */}
          {genState === 'done' && previewUrl && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-ag-border">
                {type === 'avatar' ? (
                  <img
                    src={previewUrl}
                    alt="Generated avatar preview"
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Generated background preview"
                    className="h-40 w-full object-cover"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-lg bg-accent/90 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-accent"
                >
                  Use this
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 rounded-lg border border-ag-border px-4 py-2 text-sm font-medium text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1"
                >
                  <RefreshCw size={13} />
                  Regenerate
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-ag-border px-4 py-2 text-sm font-medium text-ag-text-3 transition-colors hover:bg-ag-surface-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case 'INVALID_API_KEY':   return 'Invalid Gemini API key. Check your settings.'
    case 'RATE_LIMIT':        return 'Rate limit reached. Try again in a moment.'
    case 'NETWORK_ERROR':     return 'Network error. Check your connection.'
    case 'EMPTY_RESPONSE':    return 'No image was returned. Try a different prompt.'
    default:                  return 'Generation failed. Try again.'
  }
}
