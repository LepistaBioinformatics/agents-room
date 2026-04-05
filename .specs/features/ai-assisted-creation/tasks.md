# AI-Assisted Creation — Task Breakdown

**Feature:** AICREATE-01..28  
**Spec:** `.specs/features/ai-assisted-creation/spec.md`  
**Design:** `.specs/features/ai-assisted-creation/design.md`  
**Status:** Planned

---

## Cross-Feature Dependencies

This feature shares settings infrastructure with `agent-image-gen`. The following tasks from that feature **must be completed first**:

| IMGGEN Task | What it provides |
|---|---|
| IMGGEN-T1 — Settings infrastructure | `settings:get/set` IPC + `AppSettings` type (incl. `anthropicApiKey` field) |
| IMGGEN-T2 — SettingsDrawer | Existing drawer that T3 (this feature) extends with Anthropic key field |

---

## Task Graph

```
[IMGGEN-T1 complete] ──► T1 (@anthropic-ai/sdk + ai-generation.ts)
                     ──► T2 (IPC handlers + preload)
                         T2 ──► T4 (CreateAgentDrawer)      ──► T5 (GroupBox + AgentsRoom wiring)
                         T2 ──► T6 (CreateSkillDrawer AI)   ──┘  (T5 waits for T4, T6, T7)
                         T2 ──► T7 (CreateCommandDrawer AI) ──┘
[IMGGEN-T2 complete] ──► T3 (SettingsDrawer Anthropic key)
```

T4, T6, T7 are parallel with each other once T2 is done.

---

## Tasks

### T1 — `ai-generation.ts` module + Anthropic SDK install
**What:** Install `@anthropic-ai/sdk`; create main-process module that wraps the Anthropic API for agent/skill/command generation  
**Where:**
- `package.json` — add `@anthropic-ai/sdk`
- `src/main/ai-generation.ts` (new)

**Depends on:** IMGGEN-T1 (settings infrastructure — needs `getSettings()` to read `anthropicApiKey`)

**Install:**
```bash
npm install @anthropic-ai/sdk
```

**Module exports:**
```typescript
// src/main/ai-generation.ts

export async function generateAgent(req: { description: string }): Promise<GenerateAgentResponse>
export async function generateSkill(req: { description: string }): Promise<GenerateSkillResponse>
export async function generateCommand(req: { description: string }): Promise<GenerateCommandResponse>
// Each throws AIGenerationError on failure

export interface GenerateAgentResponse {
  name: string           // kebab-case
  description: string    // one-line, under 100 chars
  model: string          // claude-opus-4 or claude-sonnet-4-6
  tools: string[]        // valid Claude Code tools
  body: string           // markdown prompt
}

export interface GenerateSkillResponse {
  name: string
  description: string
  model: string
  body: string
}

export interface GenerateCommandResponse {
  name: string           // slug
  body: string           // slash command prompt
}

export interface AIGenerationError {
  error: 'NO_API_KEY' | 'INVALID_KEY' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'INVALID_RESPONSE'
  message?: string
}
```

**Implementation notes:**
- Use `claude-sonnet-4-6` as the generation model (spec-specified)
- Non-streaming — full response only (simpler, ~2–3s acceptable)
- Ask for JSON response (not markdown) — use `system` prompt that instructs JSON-only output
- Parse with `JSON.parse`; if parse fails → throw `{ error: 'INVALID_RESPONSE' }`

**System prompts:**

Agent:
```
You are an expert Claude Code agent designer. Turn natural language descriptions into production-ready agent configurations.

Return ONLY valid JSON with this exact structure:
{
  "name": "kebab-case-name",
  "description": "One-line summary under 100 chars",
  "model": "claude-opus-4 or claude-sonnet-4-6",
  "tools": ["Bash", "Read", "Grep"],
  "body": "Markdown prompt with clear instructions..."
}

Model selection: Deep analysis/security/complex → claude-opus-4. Most tasks → claude-sonnet-4-6.
Tools: Only include if the agent genuinely needs them. Valid options: Bash, Read, Grep, Glob, Edit, Write, WebSearch, WebFetch.
Body: Clear structured markdown with sections, constraints, and examples where helpful.
```

Skill:
```
You are an expert Claude Code skill designer. Return ONLY valid JSON:
{
  "name": "kebab-case-name",
  "description": "One-line summary under 100 chars",
  "model": "claude-sonnet-4-6",
  "body": "Markdown skill instructions..."
}
```

Command:
```
You are an expert Claude Code slash command designer. Return ONLY valid JSON:
{
  "name": "kebab-case-slug",
  "body": "Concise slash command prompt that Claude will receive when user runs /name"
}
```

**Error mapping:**
- `authenticationError` / 401 → `INVALID_KEY`
- `rateLimitError` / 429 → `RATE_LIMITED`
- Network / fetch error → `NETWORK_ERROR`
- Malformed JSON in response → `INVALID_RESPONSE`
- Missing `anthropicApiKey` in settings → `NO_API_KEY`

**Done when:**
- [ ] `@anthropic-ai/sdk` installed
- [ ] `generateAgent`, `generateSkill`, `generateCommand` exported and callable
- [ ] Each reads `anthropicApiKey` from `getSettings()` and throws `NO_API_KEY` if absent
- [ ] JSON parsing errors throw `INVALID_RESPONSE`
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T2 — IPC handlers (ai:generate-*, agent:create) + preload
**What:** Register 4 new `ipcMain.handle` calls for AI generation and agent creation; expose via preload  
**Where:**
- `src/main/ipc-handlers.ts` — new section `── AI-assisted generation ──`
- `src/preload/index.ts` — extend `ElectronAPI.skillAuthoring`

**Depends on:** T1 (ai-generation.ts functions)

**IPC handlers:**
```typescript
// ── AI-assisted generation ──────────────────────────────────────────────
ipcMain.handle('ai:generate-agent',   async (_e, p: { description: string }) =>
  generateAgent(p).catch(err => ({ error: err.error ?? 'UNKNOWN', message: err.message })))

ipcMain.handle('ai:generate-skill',   async (_e, p: { description: string }) =>
  generateSkill(p).catch(err => ({ error: err.error ?? 'UNKNOWN', message: err.message })))

ipcMain.handle('ai:generate-command', async (_e, p: { description: string }) =>
  generateCommand(p).catch(err => ({ error: err.error ?? 'UNKNOWN', message: err.message })))

// ── Agent creation ─────────────────────────────────────────────────────
ipcMain.handle('agent:create', (_e, payload: CreateAgentPayload) => {
  // payload: { name, description, model, tools, body, workspacePath }
  // Validate name: non-empty, no / \ leading .
  // Resolve agentsDir:
  //   workspacePath === '' → path.join(homedir(), '.claude', 'agents')
  //   else → path.join(workspacePath, '.claude', 'agents')
  // mkdirSync(agentsDir, { recursive: true })
  // filePath = path.join(agentsDir, `${name}.md`)
  // if existsSync(filePath) → return { error: 'NAME_CONFLICT' }
  // Build YAML frontmatter + body, writeFileSync
  // return { success: true }
})
```

**`CreateAgentPayload`:**
```typescript
interface CreateAgentPayload {
  name: string           // becomes filename (name.md) and frontmatter name
  description: string
  model: string
  tools: string[]
  body: string
  workspacePath: string  // '' = global ~/.claude/agents; absolute path for workspace-specific
}
```

**Agent `.md` file format** (mirrors skill:create pattern):
```markdown
---
name: <name>
description: <description>
model: <model>
tools:
  - Bash
  - Read
---
<body>
```

**Preload additions** (extend existing `skillAuthoring` namespace):
```typescript
skillAuthoring: {
  // ...existing (createSkill, updateSkill, duplicateSkill, createCommand, updateCommand)
  generateAgent:   (payload: { description: string }) => Promise<GenerateAgentResponse | AIGenerationError>
  generateSkill:   (payload: { description: string }) => Promise<GenerateSkillResponse | AIGenerationError>
  generateCommand: (payload: { description: string }) => Promise<GenerateCommandResponse | AIGenerationError>
  createAgent:     (payload: CreateAgentPayload) => Promise<{ success?: boolean; error?: string }>
}
```

**Done when:**
- [ ] `ai:generate-agent/skill/command` handlers registered; error passthrough works
- [ ] `agent:create` validates name, creates `agents/` dir if missing, writes `.md`, returns NAME_CONFLICT on conflict
- [ ] All 4 methods exposed in `window.electronAPI.skillAuthoring`
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T3 — SettingsDrawer: Anthropic API key section
**What:** Add Anthropic API key field to the existing `SettingsDrawer` component  
**Where:** `src/renderer/src/components/SettingsDrawer.tsx`

**Depends on:** IMGGEN-T1 (settings infra), IMGGEN-T2 (SettingsDrawer exists)

**UI additions to the "AI & APIs" section:**
- Second key field below Gemini: **Anthropic API Key**, password input, placeholder "sk-ant-..."
- Same pattern: Save + Clear buttons, status badge "Configured" (green) when present
- On mount: load both keys from `window.electronAPI.settings.get()`
- On Anthropic Save: call `window.electronAPI.settings.set({ anthropicApiKey: value })`
- On Anthropic Clear: call `window.electronAPI.settings.set({ anthropicApiKey: '' })`
- When both keys are configured: show a consolidated note "Both API integrations ready"

**Done when:**
- [ ] Anthropic API Key field renders below Gemini field
- [ ] Key saves and clears correctly
- [ ] Status badge shows when configured
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T4 — `CreateAgentDrawer` component
**What:** New drawer for creating agents, with optional AI generation toggle  
**Where:** `src/renderer/src/components/CreateAgentDrawer.tsx` (new)

**Depends on:** T2 (IPC + preload)  
**[P] Parallel with:** T6, T7

**Interface:**
```typescript
interface Props {
  workspaces: WorkspaceEntry[]
  defaultWorkspacePath?: string  // pre-select this workspace; '' = global
  open: boolean
  onClose: () => void
  onCreated: (workspacePath: string) => void
}
```

**Form fields:**
1. Workspace selector (dropdown: "Global" + each workspace name; pre-selects `defaultWorkspacePath`)
2. **AI toggle:** "Generate with AI" toggle — when ON, show description textarea + Generate button
3. Description textarea (AI section): "What should this agent do?"
4. Name (text input, required, kebab-case hint)
5. Description (text input, one-liner)
6. Model (text input: `claude-sonnet-4-6`)
7. Tools (comma-separated or tag-style input — simple text for v1: `Bash, Read, Grep`)
8. Body (textarea, mono, tall)

**State:**
```typescript
const [useAI, setUseAI] = useState(false)
const [generationDescription, setGenerationDescription] = useState('')
const [generating, setGenerating] = useState(false)
const [generationError, setGenerationError] = useState('')
const [generatedFields, setGeneratedFields] = useState(new Set<string>())
// ...plus form fields: name, description, model, tools, body, selectedWorkspacePath
```

**AI generation flow:**
1. `handleGenerateWithAI()`: validate `generationDescription` non-empty; call `window.electronAPI.skillAuthoring.generateAgent({ description: generationDescription })`
2. Show skeleton/loading state on fields during generation
3. On success: populate name, description, model, tools, body; set `generatedFields` to all populated field names
4. On error: set `generationError` with user-friendly message (map error codes below)
5. `handleFieldChange(field)`: on user edit of any generated field, remove field from `generatedFields` (clears badge)

**Error code → message mapping:**
- `NO_API_KEY` → "Anthropic API key not configured. Open Settings."
- `INVALID_KEY` → "Authentication failed. Check your API key in Settings."
- `RATE_LIMITED` → "API rate limit reached. Wait a moment and retry."
- `NETWORK_ERROR` → "Network error. Check your connection."
- `INVALID_RESPONSE` → "Generation returned unexpected content. Try again."

**"Generated by AI" badge:** Small inline badge shown next to each field label that was populated by AI. Removed individually on edit.

**Save flow (`handleSubmit`):**
1. Validate name (non-empty, no `/\`, no leading `.`)
2. Parse tools string → `string[]` (split by comma, trim)
3. Call `window.electronAPI.skillAuthoring.createAgent({ name, description, model, tools, body, workspacePath: selectedWorkspacePath })`
4. On `NAME_CONFLICT`: inline error under name field
5. On success: `onCreated(selectedWorkspacePath)`, reset form, close

**Styling:** Follow `CreateSkillDrawer` layout (DrawerShell, same field spacing).

**Done when:**
- [ ] Form renders with workspace selector, AI toggle, all fields
- [ ] AI toggle reveals generation description + Generate button
- [ ] Generation populates fields with "Generated by AI" badges
- [ ] Editing a generated field removes its badge
- [ ] Error messages shown for all error codes
- [ ] Save creates `.md` via IPC; NAME_CONFLICT shown inline
- [ ] `onCreated` called with correct workspacePath
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T5 — `WorkspaceGroupBox` agent "+" + `AgentsRoom` wiring
**What:** Add agent "+" button to WorkspaceGroupBox agents subgroup header; wire `CreateAgentDrawer` state in AgentsRoom  
**Where:**
- `src/renderer/src/components/WorkspaceGroupBox.tsx`
- `src/renderer/src/components/AgentsRoom.tsx`
- `src/renderer/src/components/AgentsCanvas.tsx` (prop threading)

**Depends on:** T4 (CreateAgentDrawer), T6, T7 (drawers complete before wiring)

**`WorkspaceGroupBox` changes:**
Add `onCreateAgent?: () => void` prop. Wire to agents `SubgroupLabel`:
```tsx
<SubgroupLabel
  color="..." label="Agents" count={workspace.agents.length}
  onAdd={onCreateAgent}
/>
```
(Follow the exact same pattern as `onCreateSkill` / `onCreateCommand` added in SCREATE-T8.)

**`AgentsCanvas` prop threading:**
```typescript
// Add to AgentsCanvas props:
onCreateAgent?: (workspacePath: string) => void
// Pass down to each WorkspaceGroupBox:
onCreateAgent={() => onCreateAgent?.(ws.entry.path)}
```

**`AgentsRoom` changes:**

State to add:
```typescript
const [createAgentOpen, setCreateAgentOpen] = useState(false)
const [createAgentDefaultWorkspacePath, setCreateAgentDefaultWorkspacePath] = useState<string | undefined>(undefined)
```

Handler:
```typescript
const handleCreateAgent = (workspacePath: string): void => {
  setCreateAgentDefaultWorkspacePath(workspacePath)
  setCreateAgentOpen(true)
}
```

Render `CreateAgentDrawer` alongside skill/command drawers:
```tsx
<CreateAgentDrawer
  open={createAgentOpen}
  workspaces={workspaces}
  defaultWorkspacePath={createAgentDefaultWorkspacePath}
  onClose={() => setCreateAgentOpen(false)}
  onCreated={(workspacePath) => {
    setCreateAgentOpen(false)
    onReloadWorkspace(workspaces.find(w => w.path === workspacePath)?.id ?? 'global')
  }}
/>
```

**Done when:**
- [ ] "+" button visible in agents subgroup header (every GroupBox)
- [ ] Click opens CreateAgentDrawer with correct workspace pre-selected
- [ ] After creation, canvas reloads and new agent card appears
- [ ] Button doesn't trigger GroupBox drag (stopPropagation on mousedown)
- [ ] `npm run typecheck` + app runs without errors

**Gate:** `npm run typecheck`

---

### T6 — AI generation section in `CreateSkillDrawer`
**What:** Add "Generate with AI" toggle and generation flow to the existing `CreateSkillDrawer`  
**Where:** `src/renderer/src/components/CreateSkillDrawer.tsx`

**Depends on:** T2 (IPC + preload)  
**[P] Parallel with:** T4, T7

**State to add:**
```typescript
const [useAI, setUseAI] = useState(false)
const [generationDescription, setGenerationDescription] = useState('')
const [generating, setGenerating] = useState(false)
const [generationError, setGenerationError] = useState('')
const [generatedFields, setGeneratedFields] = useState(new Set<string>())
```

**UI changes** (insert above name field):
- Toggle row: "Generate with AI" label + toggle switch
- When toggle ON: textarea "What should this skill do?" + "Generate" button
- Loading skeleton on name/description/model/body fields during generation

**Generation flow:**
1. Call `window.electronAPI.skillAuthoring.generateSkill({ description: generationDescription })`
2. Populate name, description, model, body on success; `generatedFields = new Set(['name', 'description', 'model', 'body'])`
3. On field edit: remove from `generatedFields`
4. On error: inline `generationError` with user-friendly message (same error code mapping as T4)

**Badge:** Show "Generated by AI" label next to field labels in `generatedFields`.

**Backward compat:** When toggle OFF, form works exactly as before — no regression.

**Done when:**
- [ ] Toggle appears above name field
- [ ] Generation populates all skill fields with badges
- [ ] Editing a field removes its badge
- [ ] Error shown inline; toggle OFF works unchanged
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

### T7 — AI generation section in `CreateCommandDrawer`
**What:** Add "Generate with AI" toggle and generation flow to the existing `CreateCommandDrawer`  
**Where:** `src/renderer/src/components/CreateCommandDrawer.tsx`

**Depends on:** T2 (IPC + preload)  
**[P] Parallel with:** T4, T6

**State to add:**
```typescript
const [useAI, setUseAI] = useState(false)
const [generationDescription, setGenerationDescription] = useState('')
const [generating, setGenerating] = useState(false)
const [generationError, setGenerationError] = useState('')
const [generatedFields, setGeneratedFields] = useState(new Set<string>())
```

**UI changes** (insert above name field, same pattern as T6):
- Toggle "Generate with AI"
- When ON: textarea "Describe the slash command" + "Generate" button
- Loading skeleton on name/body fields

**Generation flow:**
1. Call `window.electronAPI.skillAuthoring.generateCommand({ description: generationDescription })`
2. Populate name and body on success; `generatedFields = new Set(['name', 'body'])`
3. On field edit: remove from `generatedFields`
4. On error: inline error message

**Simpler than T6/T4** — commands only have `name` and `body`, so badges only appear on those two fields.

**Done when:**
- [ ] Toggle appears above name field
- [ ] Generation populates name + body with badges
- [ ] Editing clears badge on that field
- [ ] Error shown inline; toggle OFF unchanged
- [ ] `npm run typecheck` passes

**Gate:** `npm run typecheck`

---

## Status Summary

| Task | Depends on | Parallel with | Status |
|---|---|---|---|
| T1 — ai-generation.ts + SDK | IMGGEN-T1 | — | Planned |
| T2 — IPC handlers + preload | T1 | — | Planned |
| T3 — SettingsDrawer Anthropic key | IMGGEN-T1, IMGGEN-T2 | T1 | Planned |
| T4 — CreateAgentDrawer | T2 | T6, T7 | Planned |
| T5 — GroupBox agent "+" + AgentsRoom wiring | T4, T6, T7 | — | Planned |
| T6 — CreateSkillDrawer AI section | T2 | T4, T7 | Planned |
| T7 — CreateCommandDrawer AI section | T2 | T4, T6 | Planned |

---

## Traceability

| Req ID | Covered by |
|---|---|
| AICREATE-01 | T3 (Anthropic key field in SettingsDrawer) |
| AICREATE-02 | T3 (settings.set → anthropicApiKey) |
| AICREATE-03 | T4/T6/T7 (NO_API_KEY error → Settings link) |
| AICREATE-04 | T3 (consolidated status when both keys configured) |
| AICREATE-05 | T5 (agent "+" button opens CreateAgentDrawer) |
| AICREATE-06 | T4 (AI toggle + Generate → api call) |
| AICREATE-07 | T4 (loading/skeleton state during generation) |
| AICREATE-08 | T4 (fields populated from AI response) |
| AICREATE-09 | T4 (generatedFields set → badges shown) |
| AICREATE-10 | T4 (handleFieldChange removes badge) |
| AICREATE-11 | T2 (agent:create handler writes .md) + T4 (handleSubmit) |
| AICREATE-12 | T4 (generationError inline; description preserved) |
| AICREATE-13 | T6 (skill "+" already exists; AI toggle added) |
| AICREATE-14 | T6 (generateSkill → populate name/description/model/body) |
| AICREATE-15 | T6 (generated fields shown with badges) |
| AICREATE-16 | T6 (onCreated → reload after save) |
| AICREATE-17 | T7 (command "+" already exists; AI toggle added) |
| AICREATE-18 | T7 (generateCommand → populate name/body) |
| AICREATE-19 | T7 (generated fields badges) |
| AICREATE-20 | T7 (onCreated → reload after save) |
| AICREATE-21 | Deferred to post-v3 (per-field regenerate adds complexity) |
| AICREATE-22 | Deferred to post-v3 |
| AICREATE-23 | Deferred to post-v3 |
| AICREATE-24 | T5 (defaultWorkspacePath pre-selects workspace in dropdown) |
| AICREATE-25 | T4 (workspace dropdown in CreateAgentDrawer) |
| AICREATE-26 | T2 (agent:create resolves workspacePath to agents dir) |
| AICREATE-27 | T1 (system prompt instructs model + tools selection) |
| AICREATE-28 | T1 (same system prompt) |
