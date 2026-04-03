import { useState, useCallback } from 'react'
import type { TrashRecord } from '../types/agent'

interface UseTrashReturn {
  trashItems: TrashRecord[]
  trashOpen: boolean
  setTrashOpen: (open: boolean) => void
  loadTrash: () => Promise<void>
  restore: (id: string) => Promise<{ needsNewLocation?: boolean; itemName?: string }>
  deletePermanently: (id: string) => Promise<void>
}

export function useTrash(onReloadWorkspace: (workspacePath: string) => void): UseTrashReturn {
  const [trashItems, setTrashItems] = useState<TrashRecord[]>([])
  const [trashOpen, setTrashOpen] = useState(false)

  const loadTrash = useCallback(async () => {
    const items = await window.electronAPI.trash.list()
    setTrashItems(items)
  }, [])

  const restore = useCallback(async (id: string) => {
    const item = trashItems.find((t) => t.id === id)
    const result = await window.electronAPI.trash.restore(id)
    if (result.success) {
      setTrashItems((prev) => prev.filter((t) => t.id !== id))
      if (item) onReloadWorkspace(item.workspacePath)
    }
    return result
  }, [trashItems, onReloadWorkspace])

  const deletePermanently = useCallback(async (id: string) => {
    await window.electronAPI.trash.delete(id)
    setTrashItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { trashItems, trashOpen, setTrashOpen, loadTrash, restore, deletePermanently }
}
