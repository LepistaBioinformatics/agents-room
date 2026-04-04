import { useCallback } from 'react'
import { useWorkspaces } from './hooks/useWorkspaces'
import { AgentsRoom } from './components/AgentsRoom'
import type { AgentMeta } from './types/agent'

export default function App(): JSX.Element {
  const {
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
  } = useWorkspaces()

  const handleSaveAgentMeta = useCallback(
    async (agentName: string, sourcePath: string, patch: Partial<AgentMeta>) => {
      const existing = await window.electronAPI.agentMeta.get(agentName, sourcePath)
      const updated: AgentMeta = {
        agentName,
        sourcePath,
        notes: patch.notes ?? existing?.notes ?? '',
        tags: patch.tags ?? existing?.tags ?? [],
        avatarPath: patch.avatarPath ?? existing?.avatarPath,
        updatedAt: new Date().toISOString()
      }
      await window.electronAPI.agentMeta.save(updated)
      // Reload the workspace so cards reflect the updated meta immediately
      const ws = workspaces.find((w) => w.path !== '' && sourcePath.startsWith(w.path))
      reloadWorkspace(ws?.id ?? 'global')
    },
    [workspaces, reloadWorkspace]
  )

  return (
    <AgentsRoom
      workspaces={workspaces}
      loadedWorkspaces={loadedItems}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onAddWorkspace={addWorkspace}
      onRemoveWorkspace={removeWorkspace}
      onUpdateMeta={updateMeta}
      onPositionChange={updatePosition}
      onReloadAll={reloadAll}
      onReloadWorkspace={reloadWorkspace}
      onSaveAgentMeta={handleSaveAgentMeta}
    />
  )
}
