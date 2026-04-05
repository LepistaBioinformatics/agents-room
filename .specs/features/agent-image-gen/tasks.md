# Agent Image Generation — Task Breakdown

**Feature:** IMGGEN-01..20  
**Spec:** `.specs/features/agent-image-gen/spec.md`  
**Design:** `.specs/features/agent-image-gen/design.md`  
**Status:** Planned

---

## Task Graph

```
T1 (settings infra) ──► T2 (SettingsDrawer + gear)
T1                  ──► T4 (IPC handlers image + preload)
T3 (@google/genai + image-generation.ts) ──► T4
T5 (AgentMeta extension) ─────────────────────────────────┐
T4 ──► T6 (ImageGenerationModal) ──► T7 (AgentDetailDrawer integration) ◄─┘
T5 ──► T8 (AgentCard background rendering)
```

---

## Tasks

### T1 — Settings infrastructure
**What:** Create `AppSettings` type, settings.json read/write in store, and expose `settings:get` / `settings:set` IPC handlers + preload bridge  
**Where:**
- `src/main/surreal-store.ts` — add `getSettings()` / `updateSettings()` functions using `~/.agents-room/settings.json`
- `src/main/ipc-handlers.ts` — register `settings:get` and `settings:set` handlers
- `src/preload/index.ts` — expose under `window.electronAPI.settings`

**Depends on:** nothing  
**[P] Parallel with:** T3, T5

**`AppSettings` interface:**
```typescript
interface AppSettings {
  geminiApiKey?: string      // plaintext v1
  anthropicApiKey?: string   // reserved for ai-assisted-creation
}
```

**Store functions to add in `surreal-store.ts`:**
```typescript
export function getSettings(): AppSettings
export function updateSettings(updates: Partial<AppSettings>): void
// File: ~/.agents-room/settings.json
// getSettings: read + JSON.parse; return {} if missing
// updateSettings: merge with existing, write back
```

**IPC handlers in `ipc-handlers.ts`** (new section `── Settings ──`):
```typescript
ipcMain.handle('settings:get', () => getSettings())
ipcMain.handle('settings:set', (_e, updates: Partial<AppSettings>) => {
  updateSettings(updates)
  return { success: true }
})
```

**Preload additions in `ElectronAPI`:**
```typescript
settings: {
  get: () => Promise<AppSettings>
  set: (updates: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>
}
```

**Done when:**
- [ ] `AppSettings` type exported from `surreal-store.ts`
- [ ] `getSettings()` returns `{}` when file missing, parsed object otherwise
- [ ] `updateSettings()` merges and writes atomically (read → merge → write)
- [ ] `settings:get` and `settings:set` handlers registered
- [ ] `window.electronAPI.settings.get/set` accessible in renderer
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T2 — SettingsDrawer component + gear icon
**What:** New `SettingsDrawer` component with "AI & APIs" section for Gemini API key; gear icon button in `AgentsRoom` header  
**Where:**
- `src/renderer/src/components/SettingsDrawer.tsx` (new)
- `src/renderer/src/components/AgentsRoom.tsx` — gear button + conditional render

**Depends on:** T1

**`SettingsDrawer` interface:**
```typescript
interface Props {
  onClose: () => void
}
```

**UI pattern** (follow `GitHubTokenModal` layout):
- `DrawerShell` wrapper, title "Settings"
- Section header "AI & APIs"
- **Gemini API Key** field: password input, placeholder "AIza...", Save + Clear buttons
- Status badge: "Configured" (green) when key present in loaded state; no live API validation
- On Save: call `window.electronAPI.settings.set({ geminiApiKey: value })`; show "Saved" confirmation briefly
- On Clear: call `window.electronAPI.settings.set({ geminiApiKey: '' })`; field clears, badge disappears
- Load key on mount via `window.electronAPI.settings.get()`

**Note:** The Anthropic API key field will be added by the `ai-assisted-creation` feature (AICREATE-T03). Keep the "AI & APIs" section extensible — use a list/stack layout so new key fields slot in easily.

**Gear icon in `AgentsRoom`:**
- Add `Settings` icon (lucide) to the top bar
- Toggle `const [settingsOpen, setSettingsOpen] = useState(false)`
- Render `<SettingsDrawer onClose={() => setSettingsOpen(false)} />` conditionally

**Done when:**
- [ ] SettingsDrawer renders with DrawerShell
- [ ] Gemini key loads, saves, and clears correctly
- [ ] Status badge shows "Configured" when key is present
- [ ] Gear icon in AgentsRoom header opens SettingsDrawer
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T3 — `image-generation.ts` module + SDK install
**What:** Install `@google/generative-ai`; create main-process module that calls Gemini Imagen and saves the result to `~/.agents-room/avatars/`  
**Where:**
- `package.json` — add `@google/generative-ai`
- `src/main/image-generation.ts` (new)

**Depends on:** nothing (reads settings via import from `surreal-store.ts` which is done in T1 — sequence: T1 then T3)  
**[P] Parallel with:** T1, T5 (implement after T1 is merged since it imports `getSettings`)

**Install:**
```bash
npm install @google/generative-ai
```

**Research required at implementation time** (see design.md §Research Needed):
1. Confirm which Imagen model is currently recommended: `imagen-3.0-generate-fast-001` vs `gemini-2.0-flash-preview-image-generation`
2. Confirm `@google/generative-ai` image generation call signature and response format
3. Determine whether API returns base64 bytes or a URL; extract PNG bytes accordingly

**Module interface:**
```typescript
// src/main/image-generation.ts

export async function generateImage(
  prompt: string,
  type: 'avatar' | 'background',
  apiKey: string
): Promise<string>
// Returns: absolute path to saved file (e.g. /home/user/.agents-room/avatars/<uuid>.png)
// Throws: typed error string ('API_KEY_NOT_CONFIGURED' | 'INVALID_API_KEY' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'UNKNOWN')
```

**File naming:**
- Avatar: `<uuid>.png`
- Background: `<uuid>-bg.png`
- Both saved to `~/.agents-room/avatars/` (create dir if missing, same as avatar:pick)

**Error mapping:** Map Google API HTTP status codes to the typed error strings above.

**Done when:**
- [ ] `@google/generative-ai` installed and importable in main process
- [ ] `generateImage()` calls the correct Imagen model
- [ ] Returns absolute file path after saving PNG
- [ ] Creates `~/.agents-room/avatars/` if missing
- [ ] Throws typed error string on API failures
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T4 — IPC handlers for image generation + preload
**What:** Register `image:generate-avatar` and `image:generate-background` handlers in `ipc-handlers.ts`; expose via preload  
**Where:**
- `src/main/ipc-handlers.ts` — new section `── Image generation ──`
- `src/preload/index.ts` — extend `ElectronAPI` with `image` namespace

**Depends on:** T1 (settings.get for API key), T3 (generateImage function)

**IPC handlers:**
```typescript
// ── Image generation ──────────────────────────────────────────────────
ipcMain.handle('image:generate-avatar', async (_e, { prompt }: { prompt: string }) => {
  const { geminiApiKey } = getSettings()
  if (!geminiApiKey) return { success: false, error: 'API_KEY_NOT_CONFIGURED' }
  try {
    const imagePath = await generateImage(prompt, 'avatar', geminiApiKey)
    return { success: true, imagePath }
  } catch (err) {
    return { success: false, error: err }
  }
})

ipcMain.handle('image:generate-background', async (_e, { prompt }: { prompt: string }) => {
  const { geminiApiKey } = getSettings()
  if (!geminiApiKey) return { success: false, error: 'API_KEY_NOT_CONFIGURED' }
  try {
    const imagePath = await generateImage(prompt, 'background', geminiApiKey)
    return { success: true, imagePath }
  } catch (err) {
    return { success: false, error: err }
  }
})
```

**Response type:**
```typescript
interface GenerateImageResponse {
  success: boolean
  imagePath?: string   // absolute path; caller stores as ~/... in meta
  error?: 'API_KEY_NOT_CONFIGURED' | 'INVALID_API_KEY' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'UNKNOWN'
}
```

**Preload additions to `ElectronAPI`:**
```typescript
image: {
  generateAvatar:     (payload: { prompt: string }) => Promise<GenerateImageResponse>
  generateBackground: (payload: { prompt: string }) => Promise<GenerateImageResponse>
}
```

**Done when:**
- [ ] Both handlers registered and reachable
- [ ] Returns `API_KEY_NOT_CONFIGURED` when key missing in settings
- [ ] Returns `{ success: true, imagePath }` on success
- [ ] `window.electronAPI.image.generateAvatar/generateBackground` accessible in renderer
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T5 — `AgentMeta` + store extension for `cardBackground`
**What:** Add `cardBackground?: string` to `AgentMeta` in types and store  
**Where:**
- `src/renderer/src/types/agent.ts` — add field to `AgentMeta`
- `src/main/surreal-store.ts` — `AgentMeta` interface used in store (keep in sync)

**Depends on:** nothing  
**[P] Parallel with:** T1, T3

**Change in `src/renderer/src/types/agent.ts`:**
```typescript
export interface AgentMeta {
  // existing fields...
  avatarPath?: string
  cardBackground?: string   // NEW: ~/... path to background image
}
```

**Change in `src/main/surreal-store.ts`:** Mirror the same addition to whichever `AgentMeta` interface is defined there.

**Done when:**
- [ ] `cardBackground` field added to both type locations
- [ ] `npm run typecheck` passes (no new errors from the addition)

**Gate:** `npm run typecheck`

---

### T6 — `ImageGenerationModal` component
**What:** New modal component that handles prompt entry, loading, preview, confirm/cancel, and regenerate for both avatar and background generation  
**Where:** `src/renderer/src/components/ImageGenerationModal.tsx` (new)

**Depends on:** T4 (IPC available in window.electronAPI), T5 (AgentMeta type)

**Interface:**
```typescript
interface Props {
  agentName: string
  agentDescription?: string
  agentModel?: string
  agentTools?: string[]
  type: 'avatar' | 'background'
  onClose: () => void
  onConfirm: (imagePath: string) => void   // absolute path returned by IPC
}
```

**State:**
```typescript
const [prompt, setPrompt] = useState('')          // pre-filled on mount (see auto-prompt below)
const [isGenerating, setIsGenerating] = useState(false)
const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)  // data URL via avatar:read
const [generatedImagePath, setGeneratedImagePath] = useState<string | null>(null)  // absolute path
const [error, setError] = useState<string | null>(null)
```

**Auto-prompt on mount:**
```typescript
// Pre-fill prompt when agentName/description available
const autoPrompt = `Professional AI agent ${type === 'avatar' ? 'avatar/logo' : 'card background'} for "${agentName}"${agentDescription ? `, ${agentDescription}` : ''}${agentTools?.length ? `. Tools: ${agentTools.slice(0, 3).join(', ')}` : ''}. Style: minimal, dark theme, professional.`
```

**Generate flow:**
1. Disable "Generate" button if prompt is empty
2. Call `window.electronAPI.image.generateAvatar({ prompt })` or `generateBackground`
3. Show spinner / "Generating..." state
4. On success: get `imagePath`, call `window.electronAPI.avatar.read(imagePath)` → data URL → store in `generatedImageUrl`
5. Display preview with `<AvatarImg>` (for avatar) or `<img>` (for background)
6. Show "Use" + "Regenerate" + "Cancel" buttons

**Error handling:**
- `API_KEY_NOT_CONFIGURED`: show message "Gemini API key not configured." with button "Open Settings" (calls `onClose` then parent opens SettingsDrawer — use a callback prop or emit an event)
- Other errors: show inline error message; keep modal open; show Retry button

**Regenerate:** Clicking "Regenerate" runs the generate flow again with the same prompt, replacing the preview.

**"Use" (confirm):** Calls `onConfirm(generatedImagePath)` and closes.

**Modal layout:** Portal to `document.body`. Centered overlay with backdrop. Not a full DrawerShell — use a compact centered card (~400px).

**Done when:**
- [ ] Modal opens with auto-filled prompt
- [ ] Empty prompt disables Generate button
- [ ] Loading state shown during generation
- [ ] Preview renders after successful generation
- [ ] "Use" calls onConfirm with path
- [ ] "Regenerate" replaces preview with new generation
- [ ] Error messages shown inline, modal stays open
- [ ] API_KEY_NOT_CONFIGURED shows Settings link
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T7 — `AgentDetailDrawer` integration
**What:** Add "Generate with AI" button for avatar and a "Card Background" section to `AgentDetailDrawer`; wire `ImageGenerationModal`  
**Where:** `src/renderer/src/components/AgentDetailDrawer.tsx`

**Depends on:** T5 (AgentMeta type), T6 (ImageGenerationModal)

**Avatar section changes:**
- In the portrait overlay area, add a `Wand2` icon button labeled "Generate with AI" (appears on hover or always visible as a small icon button below the avatar)
- State: `[avatarModalOpen, setAvatarModalOpen]`
- `onConfirm` for avatar modal: convert absolute path to `~/...` format → call `onSaveMeta({ ...currentMeta, avatarPath: normalizedPath })` → `setAvatarModalOpen(false)`

**Background section (new, in drawer body):**
- Section title "Card Background"
- If `agent.meta?.cardBackground` is set: show small preview thumbnail + "Remove" button
  - Remove: call `onSaveMeta({ ...currentMeta, cardBackground: undefined })`
- Always show "Generate with AI" button (Wand2 icon)
- State: `[bgModalOpen, setBgModalOpen]`
- `onConfirm` for background modal: normalize path → call `onSaveMeta({ ...currentMeta, cardBackground: normalizedPath })` → `setBgModalOpen(false)`

**Path normalization helper** (reuse or copy pattern from avatar:pick):
```typescript
function toTildePath(absolutePath: string): string {
  return absolutePath.startsWith(homedir()) 
    ? '~' + absolutePath.slice(homedir().length) 
    : absolutePath
}
// Note: homedir not available in renderer — pass it through store or use a simpler approach:
// store it as-is (absolute) since avatar:read IPC already resolves both absolute and ~/... paths
```
**Decision:** Store the path as returned by the IPC (absolute). The store's `AgentMeta.save` already normalizes via the main process. Check existing `onSaveAgentMeta` flow — if it already normalizes, no change needed.

**Render both modals:**
```tsx
{avatarModalOpen && (
  <ImageGenerationModal
    agentName={agent.name}
    agentDescription={agent.description}
    agentModel={agent.model}
    agentTools={agent.tools}
    type="avatar"
    onClose={() => setAvatarModalOpen(false)}
    onConfirm={(path) => { /* save + close */ }}
  />
)}
{bgModalOpen && (
  <ImageGenerationModal ... type="background" ... />
)}
```

**Done when:**
- [ ] "Generate with AI" button opens avatar modal
- [ ] Confirming avatar updates the portrait section immediately (via workspace reload)
- [ ] Card Background section appears in drawer body
- [ ] "Generate with AI" for background opens background modal
- [ ] Confirming background persists in meta; "Remove" clears it
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T8 — `AgentCard` background rendering
**What:** Update `AgentCard` to render `cardBackground` as a full-bleed background image with dark overlay when present  
**Where:** `src/renderer/src/components/AgentCard.tsx`

**Depends on:** T5 (AgentMeta type with cardBackground)

**Logic:**
1. On mount / when `agent.meta?.cardBackground` changes: call `window.electronAPI.avatar.read(agent.meta.cardBackground)` → data URL → store in local state `bgDataUrl`
2. If `bgDataUrl` present: render as `style={{ backgroundImage: \`url(${bgDataUrl})\` }}` on the card container with `bg-cover bg-center`
3. Add inner overlay div: `absolute inset-0 bg-black/60` (Tailwind) to keep text legible
4. Ensure card content (name, badges, description) renders above the overlay via `relative z-10`
5. Fallback: if `cardBackground` missing or `avatar:read` fails → existing initials/gradient unchanged

**Done when:**
- [ ] Card with `cardBackground` meta shows background image
- [ ] Text remains legible (dark overlay present)
- [ ] Cards without `cardBackground` render unchanged
- [ ] No console errors if `avatar:read` fails (silent fallback)
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

## Status Summary

| Task | Depends on | Parallel with | Status |
|---|---|---|---|
| T1 — Settings infrastructure | — | T3, T5 | Done ✅ |
| T2 — SettingsDrawer + gear icon | T1 | — | Done ✅ |
| T3 — image-generation.ts + SDK | (T1 for import) | T1, T5 | Done ✅ |
| T4 — IPC handlers image + preload | T1, T3 | — | Done ✅ |
| T5 — AgentMeta extension | — | T1, T3 | Done ✅ |
| T6 — ImageGenerationModal | T4 | — | Done ✅ |
| T7 — AgentDetailDrawer integration | T5, T6 | — | Done ✅ |
| T8 — AgentCard background rendering | T5 | T1, T3 | Done ✅ |

---

## Traceability

| Req ID | Covered by |
|---|---|
| IMGGEN-01 | T1 (settings:get/set), T2 (SettingsDrawer field) |
| IMGGEN-02 | T1 (updateSettings → geminiApiKey), T2 (save flow) |
| IMGGEN-03 | T2 (status badge) |
| IMGGEN-04 | T6 (API_KEY_NOT_CONFIGURED error → Settings link) |
| IMGGEN-05 | T7 (Generate with AI button in portrait section) |
| IMGGEN-06 | T6 (modal: prompt field + Generate button) |
| IMGGEN-07 | T6 (auto-prompt pre-fill on mount) |
| IMGGEN-08 | T4 (IPC calls Gemini), T3 (generateImage) |
| IMGGEN-09 | T6 (loading state), T4 (IPC) |
| IMGGEN-10 | T6 (preview via avatar:read, Use/Cancel) |
| IMGGEN-11 | T7 (onConfirm → save avatar path → reload) |
| IMGGEN-12 | T7 (Card Background section in drawer) |
| IMGGEN-13 | T7 (onConfirm → save cardBackground → reload) |
| IMGGEN-14 | T8 (AgentCard renders background with overlay) |
| IMGGEN-15 | T7 (Remove button → clear cardBackground) |
| IMGGEN-16 | T6 (Regenerate button visible after first generation) |
| IMGGEN-17 | T6 (Regenerate re-calls generate flow, replaces preview) |
| IMGGEN-18 | T6 (loading state during regenerate, modal stays open) |
| IMGGEN-19 | T6 (auto-prompt using name + description + tools) |
| IMGGEN-20 | T6 (user edits prompt; auto-prompt is initial value, not enforced) |
