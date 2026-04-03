import { useState, useEffect, useCallback } from 'react'
import type { WorkspaceEntry, WorkspaceItems, CanvasPosition } from '../types/agent'

interface LoadedWorkspace {
  entry: WorkspaceEntry
  items: WorkspaceItems
  position: CanvasPosition
  loading: boolean
}

interface UseWorkspacesReturn {
  workspaces: WorkspaceEntry[]
  loadedItems: Map<string, LoadedWorkspace>
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  addWorkspace: () => Promise<void>
  removeWorkspace: (id: string) => void
  updateMeta: (id: string, meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>) => Promise<void>
  reloadWorkspace: (id: string) => Promise<void>
  reloadAll: () => Promise<void>
  updatePosition: (id: string, pos: CanvasPosition) => void
}

// Canvas is 6000×4000; centerOnInit shows the middle, so place boxes around (2500, 1700)
const CANVAS_CENTER_X = 2500
const CANVAS_CENTER_Y = 1700
const DEFAULT_POSITIONS: Record<string, CanvasPosition> = {}
let posCol = 0

function getDefaultPosition(id: string): CanvasPosition {
  if (!DEFAULT_POSITIONS[id]) {
    DEFAULT_POSITIONS[id] = { x: CANVAS_CENTER_X + posCol * 1100, y: CANVAS_CENTER_Y }
    posCol++
  }
  return DEFAULT_POSITIONS[id]
}

export function useWorkspaces(): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([])
  const [loadedItems, setLoadedItems] = useState<Map<string, LoadedWorkspace>>(new Map())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const loadItems = useCallback(async (entry: WorkspaceEntry) => {
    // Mark as loading
    setLoadedItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(entry.id)
      next.set(entry.id, {
        entry,
        items: existing?.items ?? { workspaceId: entry.id, workspacePath: entry.path, agents: [], skills: [], commands: [] },
        position: existing?.position ?? getDefaultPosition(entry.id),
        loading: true
      })
      return next
    })

    const [items, savedPos] = await Promise.all([
      window.electronAPI.workspaces.loadItems(entry.path),
      window.electronAPI.canvas.getPosition(entry.id)
    ])

    setLoadedItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(entry.id)
      next.set(entry.id, {
        entry,
        items: { ...items, workspaceId: entry.id },
        position: savedPos ?? existing?.position ?? getDefaultPosition(entry.id),
        loading: false
      })
      return next
    })
  }, [])

  const loadAll = useCallback(async (entries: WorkspaceEntry[]) => {
    await Promise.all(entries.map(loadItems))
  }, [loadItems])

  // Initial load
  useEffect(() => {
    window.electronAPI.workspaces.list().then((entries) => {
      setWorkspaces(entries)
      loadAll(entries)
    })
  }, [loadAll])

  const addWorkspace = useCallback(async () => {
    const entry = await window.electronAPI.workspaces.add()
    if (!entry) return
    let isNew = false
    setWorkspaces((prev) => {
      if (prev.some((w) => w.id === entry.id)) return prev
      isNew = true
      return [...prev, entry]
    })
    if (isNew) await loadItems(entry)
  }, [loadItems])

  const removeWorkspace = useCallback((id: string) => {
    if (id === 'global') return
    window.electronAPI.workspaces.remove(id)
    setWorkspaces((prev) => prev.filter((w) => w.id !== id))
    setLoadedItems((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const updateMeta = useCallback(async (
    id: string,
    meta: Partial<Pick<WorkspaceEntry, 'name' | 'emoji' | 'tags' | 'displayName' | 'avatarPath'>>
  ) => {
    const updated = await window.electronAPI.workspaces.updateMeta(id, meta)
    if (!updated) return
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)))
    setLoadedItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(id)
      if (existing) next.set(id, { ...existing, entry: updated })
      return next
    })
  }, [])

  const reloadWorkspace = useCallback(async (id: string) => {
    const entry = workspaces.find((w) => w.id === id)
    if (entry) await loadItems(entry)
  }, [workspaces, loadItems])

  const reloadAll = useCallback(async () => {
    await loadAll(workspaces)
  }, [workspaces, loadAll])

  const updatePosition = useCallback((id: string, pos: CanvasPosition) => {
    window.electronAPI.canvas.setPosition(id, pos)
    setLoadedItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(id)
      if (existing) next.set(id, { ...existing, position: pos })
      return next
    })
  }, [])

  return {
    workspaces,
    loadedItems,
    sidebarOpen,
    setSidebarOpen,
    addWorkspace,
    removeWorkspace,
    updateMeta,
    reloadWorkspace,
    reloadAll,
    updatePosition
  }
}
