# Handoff

**Date:** 2026-04-04
**Features:** agent-image-gen + ai-assisted-creation (v3) — fully implemented

## Completed ✓

### agent-image-gen (IMGGEN T1–T8)
- `src/main/image-generation.ts` — `generateImage(prompt, type, apiKey)` via `@google/genai`, model `imagen-3.0-generate-fast-001`, saves PNG to `~/.agents-room/avatars/`
- `src/main/ipc-handlers.ts` — `image:generate-avatar` + `image:generate-background` handlers
- `src/preload/index.ts` — `window.electronAPI.image.generateAvatar/generateBackground`
- `src/main/surreal-store.ts` — `cardBackground` added to `AgentMeta`; `packMeta`/`unpackMeta` updated; `AppSettings` + `getSettings`/`updateSettings` with safeStorage encryption
- `src/renderer/src/components/ImageGenerationModal.tsx` — portal modal, auto-prompt, preview, avatar/background modes
- `src/renderer/src/components/AgentDetailDrawer.tsx` — generate avatar button + card background section
- `src/renderer/src/components/AgentCard.tsx` — `cardBackground` image with overlay
- `src/renderer/src/components/SettingsDrawer.tsx` — Gemini API key section (+ Anthropic + GitHub, see below)

### ai-assisted-creation (AICREATE T1–T7)
- `src/main/ai-generation.ts` — `generateAgent/generateSkill/generateCommand()` via `@anthropic-ai/sdk`, `claude-sonnet-4-6`, JSON-only system prompts
- `src/main/ipc-handlers.ts` — `ai:generate-agent/skill/command` + `agent:create` handlers
- `src/preload/index.ts` — `window.electronAPI.skillAuthoring.generateAgent/generateSkill/generateCommand/createAgent`
- `src/renderer/src/lib/ai-error.ts` — `mapAIError(code)` for user-facing messages
- `src/renderer/src/components/CreateAgentDrawer.tsx` — new component, workspace selector, AI toggle, all fields, AI badge
- `src/renderer/src/components/CreateSkillDrawer.tsx` — AI toggle + badge added
- `src/renderer/src/components/CreateCommandDrawer.tsx` — AI toggle + badge added
- `src/renderer/src/components/WorkspaceGroupBox.tsx` — `onCreateAgent` prop + Agents subgroup "+" button
- `src/renderer/src/components/AgentsCanvas.tsx` — `onCreateAgent` prop threaded through
- `src/renderer/src/components/AgentsRoom.tsx` — `settingsOpen` state, gear icon, `SettingsDrawer`, `CreateAgentDrawer`

### GitHub token → SettingsDrawer consolidation
- `src/renderer/src/components/SettingsDrawer.tsx` — added "Integrations" section with GitHub token card (uses `settings.getGitHubToken/setGitHubToken/clearGitHubToken`, displays masked value)
- `src/renderer/src/components/BrowseSkillsPanel.tsx` — `onOpenSettings` prop; removed `showTokenModal` state and `GitHubTokenModal` import/render; KeyRound button calls `onOpenSettings?.()`
- `src/renderer/src/components/AgentsRoom.tsx` — passes `onOpenSettings={() => { setBrowsePanelOpen(false); setSettingsOpen(true) }}` to BrowseSkillsPanel
- `src/renderer/src/components/GitHubTokenModal.tsx` — **deleted**

## In Progress

Nothing — session complete. Typecheck passed.

## Pending

Next planned v3 items (from ROADMAP):
- Manual relationship overrides (drag to link agents)
- Agent dependency graph (DAG view)

## Key Decisions

- `@google/genai` v1.x (NOT `@google/generative-ai` which is deprecated and text-only)
- All API calls (Gemini, Anthropic) in main process only — keys never reach renderer bundle
- `app-settings:get/set` IPC namespace (avoids collision with existing `settings:*` namespace)
- All API keys encrypted via `safeStorage` (`enc:<base64>` / `plain:` fallback) — same pattern as GitHub token
- `getGitHubToken()` returns `{ configured, masked }` — use `masked` for display, never raw token in renderer
