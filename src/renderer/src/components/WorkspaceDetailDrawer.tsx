import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, FileText, Settings, Tag, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { WorkspaceEntry } from '../types/agent'
import { cn } from '../lib/utils'
import { AvatarImg } from './AvatarImg'

interface SettingsFile {
  filename: string
  path: string
  content: string
}

interface Props {
  workspace: WorkspaceEntry | null
  onClose: () => void
  onUpdateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => void
  onRemove: (id: string) => void
}

const EMOJI_OPTIONS = ['📁', '🚀', '⚙️', '🧠', '🎯', '🔧', '💡', '🌟', '🔬', '🛠️', '🏗️', '🎨', '📦', '🔑', '🌐']

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ag-text-2">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{label}</span>
    </div>
  )
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function EmojiPicker({
  anchorRef, onPick, onClose
}: {
  anchorRef: React.RefObject<HTMLButtonElement>
  onPick: (emoji: string) => void
  onClose: () => void
}): JSX.Element {
  const rect = anchorRef.current?.getBoundingClientRect()
  const top = rect ? rect.bottom + 4 : 0
  const left = rect ? rect.left : 0

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  return createPortal(
    <div
      style={{ position: 'fixed', top, left, zIndex: 9999 }}
      className="grid grid-cols-5 gap-1 rounded-xl border border-ag-border bg-ag-surface p-2 shadow-xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {EMOJI_OPTIONS.map((e) => (
        <button
          key={e}
          onClick={() => { onPick(e); onClose() }}
          className="rounded p-1.5 text-lg leading-none hover:bg-ag-surface-2 transition-colors"
        >
          {e}
        </button>
      ))}
    </div>,
    document.body
  )
}

export function WorkspaceDetailDrawer({ workspace, onClose, onUpdateMeta, onRemove }: Props): JSX.Element | null {
  const [claudeMd, setClaudeMd] = useState('')
  const [resolvedPath, setResolvedPath] = useState('')
  const [settingsFiles, setSettingsFiles] = useState<SettingsFile[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [displayNameValue, setDisplayNameValue] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!workspace) return
    setLoading(true)
    setSaved(false)
    setConfirmDelete(false)
    setDisplayNameValue(workspace.displayName ?? '')
    setTagInput('')
    Promise.all([
      window.electronAPI.workspaces.readClaudeMd(workspace.path),
      window.electronAPI.workspaces.readSettings(workspace.path)
    ]).then(([{ content, resolvedPath: p }, settings]) => {
      setClaudeMd(content)
      setResolvedPath(p)
      setSettingsFiles(settings)
      setLoading(false)
    })
  }, [workspace?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = useCallback(async () => {
    if (!workspace) return
    setSaving(true)
    await window.electronAPI.workspaces.writeClaudeMd(workspace.path, claudeMd)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [workspace, claudeMd])

  const handlePickAvatar = async (): Promise<void> => {
    if (!workspace) return
    const path = await window.electronAPI.avatar.pick()
    if (path) onUpdateMeta(workspace.id, { avatarPath: path })
  }

  const commitDisplayName = (): void => {
    if (!workspace) return
    const val = displayNameValue.trim()
    onUpdateMeta(workspace.id, { displayName: val || undefined })
  }

  const handleDelete = (): void => {
    if (!workspace) return
    onRemove(workspace.id)
    onClose()
  }

  if (!workspace) return null

  const isGlobal = workspace.id === 'global'
  const shownName = workspace.displayName || workspace.name

  return (
    <>
      <div className="fixed inset-0 bg-black/50 animate-fade-in" style={{ zIndex: 40 }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 flex h-full w-[620px] flex-col bg-ag-surface border-l border-ag-border shadow-2xl animate-slide-in overflow-hidden"
        style={{ zIndex: 50 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ag-border bg-ag-surface-2 px-6 py-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <button
              onClick={handlePickAvatar}
              title="Trocar avatar"
              className="relative shrink-0 mt-0.5 group/avatar hover:opacity-80 transition-opacity"
            >
              {workspace.avatarPath ? (
                <AvatarImg path={workspace.avatarPath} size={48} rounded="xl" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ag-surface border border-ag-border">
                  <span className="text-2xl">{workspace.emoji}</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Pencil size={14} className="text-white" />
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-ag-surface border border-ag-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ag-text-2">
                  {isGlobal ? 'global' : 'workspace'}
                </span>
                {/* Emoji picker */}
                {!isGlobal && (
                  <button
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="text-xl leading-none rounded px-1 py-0.5 hover:bg-ag-surface transition-colors"
                    title="Trocar emoji"
                  >
                    {workspace.emoji}
                  </button>
                )}
                {showEmojiPicker && (
                  <EmojiPicker
                    anchorRef={emojiButtonRef}
                    onPick={(e) => onUpdateMeta(workspace.id, { emoji: e })}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <h2 className="text-lg font-bold uppercase tracking-wide text-ag-text-1 leading-tight">{shownName}</h2>
              {workspace.path && (
                <p className="mt-0.5 text-xs text-ag-text-3 truncate" title={workspace.path}>
                  {workspace.path}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ag-text-3 transition-colors hover:bg-ag-surface hover:text-ag-text-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Display name */}
          {!isGlobal && (
            <div className="border-b border-ag-border px-6 py-4">
              <SectionHeader icon={<Pencil size={13} />} label="Nome de exibição" />
              <div className="mt-3 flex gap-2">
                <input
                  value={displayNameValue}
                  onChange={(e) => setDisplayNameValue(e.target.value)}
                  onBlur={commitDisplayName}
                  onKeyDown={(e) => { if (e.key === 'Enter') { commitDisplayName(); e.currentTarget.blur() } }}
                  placeholder={workspace.name}
                  className="flex-1 rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {!isGlobal && (
            <div className="border-b border-ag-border px-6 py-4">
              <SectionHeader icon={<Tag size={13} />} label="Tags" />
              <div className="mt-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {workspace.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 rounded-full bg-ag-surface-2 border border-ag-border px-2.5 py-1 text-xs text-ag-text-2">
                      {tag}
                      <button
                        onClick={() => onUpdateMeta(workspace.id, { tags: workspace.tags.filter((t) => t !== tag) })}
                        className="text-ag-text-3 hover:text-ag-text-1 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      const t = tagInput.trim()
                      if (!workspace.tags.includes(t)) {
                        onUpdateMeta(workspace.id, { tags: [...workspace.tags, t] })
                      }
                      setTagInput('')
                    }
                  }}
                  placeholder="Adicionar tag e pressionar Enter…"
                  className="w-full rounded-lg border border-ag-border bg-ag-surface-2 px-3 py-2 text-sm text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-ag-text-3">Carregando…</div>
          ) : (
            <>
              {/* CLAUDE.md */}
              <div className="border-b border-ag-border px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={<FileText size={13} />} label="CLAUDE.md" />
                  <span className="text-[10px] text-ag-text-3 font-mono truncate max-w-[260px]" title={resolvedPath}>
                    {resolvedPath}
                  </span>
                </div>
                <textarea
                  value={claudeMd}
                  onChange={(e) => setClaudeMd(e.target.value)}
                  placeholder="Nenhum CLAUDE.md encontrado. Escreva instruções para o Claude neste workspace…"
                  rows={12}
                  className="w-full resize-none rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3 text-sm font-mono text-ag-text-1 placeholder:text-ag-text-3 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    'mt-2.5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    saved
                      ? 'bg-emerald-700/80 text-emerald-100'
                      : 'bg-indigo-600/90 text-white hover:bg-indigo-600 disabled:opacity-50'
                  )}
                >
                  <Save size={13} />
                  {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar CLAUDE.md'}
                </button>
              </div>

              {/* Settings files */}
              <div className={cn('px-6 py-5', !isGlobal && 'border-b border-ag-border')}>
                <SectionHeader icon={<Settings size={13} />} label="Settings" />
                {settingsFiles.length === 0 ? (
                  <p className="mt-3 text-xs text-ag-text-3">Nenhum arquivo de settings encontrado em .claude/</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {settingsFiles.map((file) => (
                      <div key={file.path}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono font-medium text-ag-text-2">{file.filename}</span>
                          <span className="text-[10px] text-ag-text-3 font-mono truncate max-w-[260px]" title={file.path}>
                            {file.path}
                          </span>
                        </div>
                        <pre className="overflow-x-auto rounded-xl border border-ag-border bg-ag-surface-2 px-4 py-3 text-[11px] font-mono text-ag-text-1 leading-relaxed whitespace-pre-wrap break-all">
                          {file.content ? formatJson(file.content) : <span className="text-ag-text-3">(vazio)</span>}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger zone — delete workspace */}
              {!isGlobal && (
                <div className="px-6 py-5">
                  <SectionHeader icon={<Trash2 size={13} />} label="Zona de perigo" />
                  <div className="mt-3 rounded-xl border border-red-900/40 bg-red-950/10 px-4 py-3">
                    <p className="text-xs text-ag-text-2 mb-3">
                      Remove este workspace da lista. Os arquivos do projeto não serão apagados.
                    </p>
                    {confirmDelete ? (
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="flex-1 text-xs text-red-400">Tem certeza? Esta ação não pode ser desfeita.</span>
                        <button
                          onClick={handleDelete}
                          className="rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-800/40 transition-colors"
                        >
                          Remover
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs text-ag-text-3 hover:text-ag-text-2 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-2 rounded-lg border border-red-900/40 px-3 py-1.5 text-xs text-red-500/80 hover:border-red-700/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} /> Remover workspace
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
