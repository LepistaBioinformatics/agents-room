import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import type { WorkspaceEntry, WorkspaceItems, AgentView, SkillItem, CommandItem, CanvasPosition, TrashItemType } from '../types/agent'
import { WorkspaceGroupBox } from './WorkspaceGroupBox'

export interface AgentsCanvasHandle {
  panTo: (x: number, y: number) => void
}

interface LoadedWorkspace {
  entry: WorkspaceEntry
  items: WorkspaceItems
  position: CanvasPosition
  loading: boolean
}

interface Props {
  loadedWorkspaces: Map<string, LoadedWorkspace>
  workspaces: WorkspaceEntry[]
  selectedAgentKey: string | null
  onSelectAgent: (agent: AgentView) => void
  onSelectSkill: (skill: SkillItem) => void
  onSelectCommand: (command: CommandItem) => void
  onPositionChange: (id: string, pos: CanvasPosition) => void
  activeTagFilters: Set<string>
  highlightedItemPath: string | null
  onTrash: (srcPath: string, workspacePath: string, type: TrashItemType, name: string) => Promise<void>
  onDuplicate: (srcPath: string, type: TrashItemType) => Promise<void>
  onCopy: (srcPath: string, targetPath: string, type: TrashItemType) => Promise<void>
  onCreateSkill?: (workspacePath: string) => void
  onCreateCommand?: (workspacePath: string) => void
  onCreateAgent?: (workspacePath: string) => void
}

const CANVAS_W = 6000
const CANVAS_H = 4000
const INITIAL_SCALE = 0.85
const PADDING = 80

export const AgentsCanvas = forwardRef<AgentsCanvasHandle, Props>(function AgentsCanvas({
  loadedWorkspaces, workspaces, selectedAgentKey,
  onSelectAgent, onSelectSkill, onSelectCommand, onPositionChange, onTrash, onDuplicate, onCopy,
  activeTagFilters, highlightedItemPath, onCreateSkill, onCreateCommand, onCreateAgent
}, ref) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const didInitialCenter = useRef(false)

  useImperativeHandle(ref, () => ({
    panTo(x: number, y: number) {
      transformRef.current?.setTransform(
        -(x * INITIAL_SCALE) + PADDING,
        -(y * INITIAL_SCALE) + PADDING,
        INITIAL_SCALE,
        300
      )
    }
  }))

  useEffect(() => {
    if (loadedWorkspaces.size === 0) return
    if (didInitialCenter.current) return
    const allLoaded = Array.from(loadedWorkspaces.values()).every((ws) => !ws.loading)
    if (!allLoaded) return
    if (!transformRef.current) return

    didInitialCenter.current = true
    const positions = Array.from(loadedWorkspaces.values()).map((ws) => ws.position)
    const minX = Math.min(...positions.map((p) => p.x))
    const minY = Math.min(...positions.map((p) => p.y))

    transformRef.current.setTransform(
      -(minX * INITIAL_SCALE) + PADDING,
      -(minY * INITIAL_SCALE) + PADDING,
      INITIAL_SCALE,
      0
    )
  }, [loadedWorkspaces])

  const centerOnContent = (): void => {
    if (!transformRef.current) return
    const positions = Array.from(loadedWorkspaces.values()).map((ws) => ws.position)
    if (positions.length === 0) return
    const minX = Math.min(...positions.map((p) => p.x))
    const minY = Math.min(...positions.map((p) => p.y))
    transformRef.current.setTransform(
      -(minX * INITIAL_SCALE) + PADDING,
      -(minY * INITIAL_SCALE) + PADDING,
      INITIAL_SCALE,
      300
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-ag-bg"
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(var(--ag-border) / 0.55) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={INITIAL_SCALE}
        minScale={0.15}
        maxScale={2.5}
        limitToBounds={false}
        panning={{ velocityDisabled: false }}
      >
        {({ zoomIn, zoomOut }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1" style={{ zIndex: 20 }}>
              <button
                onClick={() => zoomIn()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ag-border bg-ag-surface text-sm text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1 shadow-lg"
              >+</button>
              <button
                onClick={() => zoomOut()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ag-border bg-ag-surface text-sm text-ag-text-2 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1 shadow-lg"
              >−</button>
              <button
                onClick={centerOnContent}
                title="Reset view"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ag-border bg-ag-surface text-[10px] text-ag-text-3 transition-colors hover:bg-ag-surface-2 hover:text-ag-text-1 shadow-lg"
              >⊙</button>
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}
            >
              {Array.from(loadedWorkspaces.values()).map((ws) => (
                <WorkspaceGroupBox
                  key={ws.entry.id}
                  entry={ws.entry}
                  items={ws.items}
                  loading={ws.loading}
                  position={ws.position}
                  workspaces={workspaces}
                  selectedAgentKey={selectedAgentKey}
                  onSelectAgent={onSelectAgent}
                  onSelectSkill={onSelectSkill}
                  onSelectCommand={onSelectCommand}
                  onPositionChange={(pos) => onPositionChange(ws.entry.id, pos)}
                  activeTagFilters={activeTagFilters}
                  highlightedItemPath={highlightedItemPath}
                  onTrash={onTrash}
                  onDuplicate={onDuplicate}
                  onCopy={onCopy}
                  onCreateSkill={onCreateSkill ? () => onCreateSkill(ws.entry.path) : undefined}
                  onCreateCommand={onCreateCommand ? () => onCreateCommand(ws.entry.path) : undefined}
                  onCreateAgent={onCreateAgent ? () => onCreateAgent(ws.entry.path) : undefined}
                />
              ))}
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
})
