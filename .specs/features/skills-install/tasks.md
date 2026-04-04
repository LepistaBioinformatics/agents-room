# Skills Install — Tasks

**Spec**: `.specs/features/skills-install/spec.md`
**Design**: `.specs/features/skills-install/design.md`
**Status**: Complete

---

## Execution Plan

```
Round 1 (parallel):  TASK-01 · TASK-02 · TASK-05
Round 2 (serial):    TASK-03 (after TASK-02)
Round 3 (serial):    TASK-04 (after TASK-01 + TASK-03)
Round 4 (parallel):  TASK-06 · TASK-07 · TASK-08 (after TASK-04 + TASK-05)
Round 5 (serial):    TASK-09 (after TASK-08)
```

---

## Tasks

### TASK-01 — Types & Store foundation

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-02 and TASK-05)
**Depends on**: —

**What**:
1. `src/renderer/src/types/agent.ts` — add to the existing file:
   - `TrustTier = 'trusted' | 'known' | 'unknown'`
   - `SkillMeta` interface (skillName, sourceUrl, sourceOwner, sourceRepo, sourcePath, sourceBranch, trustTier, installedAt)
   - `GitHubRef` interface (owner, repo, path, branch)
   - `GitHubRepoInfo` interface (stars, orgName, description, updatedAt)
   - `RemoteSkillCard` interface (name, description, model, folderName, sourceUrl, files, isInstalled)
   - `SkillSource` interface (id, name, description, owner, repo, path, branch, url)
   - `SkillPreview` interface (skill: RemoteSkillCard, tier: TrustTier, repoInfo: GitHubRepoInfo | null, ref: GitHubRef)
   - Extend `SkillItem` with `meta?: SkillMeta | null`

2. `src/main/surreal-store.ts`:
   - Export `SkillMeta` type (re-export or duplicate from agent.ts — main process doesn't import from renderer; use a local interface that matches)
   - Add `skillMeta: Record<string, SkillMeta>` to `StoreData` interface with default `{}`
   - Add to `readStore` defaults: `skillMeta: data.skillMeta ?? {}`
   - Add to `initDB` writeStore call: `skillMeta: {}`
   - Add functions: `getSkillMeta(skillName: string): SkillMeta | null`, `saveSkillMeta(meta: SkillMeta): void`, `removeSkillMeta(skillName: string): void`, `getAllSkillMeta(): SkillMeta[]`

**Where**:
- `src/renderer/src/types/agent.ts`
- `src/main/surreal-store.ts`

**Done when**:
- `SkillMeta` and all related types are defined in `agent.ts`
- `SkillItem` has `meta?: SkillMeta | null`
- `surreal-store.ts` compiles with the new functions and `StoreData.skillMeta`
- `getSkillMeta('foo')` returns null when key not in store

---

### TASK-02 — GitHub API client

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-01 and TASK-05)
**Depends on**: —

**What**: Create `src/main/github-api.ts` with:

- `interface GitHubRef { owner, repo, path, branch }` (local to main)
- `interface GitHubRepoInfo { stars, orgName, description, updatedAt }` (local to main)
- `interface GitHubDirEntry { name: string; type: 'file' | 'dir'; download_url: string | null; path: string }`
- `class GitHubError extends Error { code: 'GH_NOT_FOUND' | 'GH_RATE_LIMITED' | 'GH_NO_SKILL_MD'; resetAt?: number }`
- `parseGitHubUrl(url: string): GitHubRef | null`
  - Handles: `github.com/owner/repo`, `github.com/owner/repo/tree/branch/path`, `github.com/owner/repo/blob/branch/path`
  - Returns null for non-GitHub URLs
  - Default branch: `'main'` when not present in URL
- `fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo>`
  - GET `https://api.github.com/repos/{owner}/{repo}`
  - On 403 + X-RateLimit-Remaining: 0 → throw `GitHubError('GH_RATE_LIMITED')` with `resetAt` from `X-RateLimit-Reset` header
  - On 404 → throw `GitHubError('GH_NOT_FOUND')`
- `fetchDirectoryContents(owner: string, repo: string, path: string, branch: string): Promise<GitHubDirEntry[]>`
  - GET `https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}`
  - Same error handling
- `fetchFileContent(owner: string, repo: string, path: string, branch: string): Promise<string>`
  - GET `https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}`
  - Decodes base64 `content` field from response
- `fetchSkillPreview(ref: GitHubRef): Promise<{ name: string; description: string; model: string | null; folderName: string; sourceUrl: string; files: string[] }>`
  - Fetches directory contents at `ref.path`
  - Finds `SKILL.md` in the listing (case-sensitive); if not found → throw `GitHubError('GH_NO_SKILL_MD')`
  - Fetches and parses `SKILL.md` frontmatter using `gray-matter`
  - Returns name, description, model from frontmatter + file list + sourceUrl

**Where**: `src/main/github-api.ts`

**Done when**:
- File compiles with no TS errors
- `parseGitHubUrl('https://github.com/owner/repo/tree/main/skills/my-skill')` → `{ owner: 'owner', repo: 'repo', path: 'skills/my-skill', branch: 'main' }`
- `parseGitHubUrl('https://notgithub.com/foo')` → `null`
- Error types are exported

---

### TASK-03 — Allowlist & Installer

**Status**: Complete
**Parallel**: No
**Depends on**: TASK-02

**What**:

1. Create `src/main/skills-allowlist.ts`:
   - Export `TrustTier = 'trusted' | 'known' | 'unknown'` (local, matches renderer type)
   - Export `SkillSource` interface (matches design data model)
   - Export `TRUSTED_SOURCES: SkillSource[]` — empty array with a `// TODO: add anthropics/claude-skills when available` comment
   - Export `resolveTrustTier(owner: string, repo: string): TrustTier`:
     - If `owner/repo` matches any entry in `TRUSTED_SOURCES` → `'trusted'`
     - Else → `'known'` (GitHub URL parsed successfully = public GitHub)
     - Note: `'unknown'` is assigned by the IPC handler when `parseGitHubUrl` returns null

2. Create `src/main/skills-installer.ts`:
   - Imports: `github-api.ts`, Node `fs`, `path`, `os`
   - `installSkill(ref: GitHubRef, skillName: string): Promise<string>`:
     - Target: `~/.claude/skills/<skillName>/`
     - `mkdirSync(targetDir, { recursive: true })` — creates `~/.claude/skills/` and subdirectory
     - Fetch directory contents at `ref.path`
     - For each file entry: `fetchFileContent` → `writeFileSync`
     - On any error: `rmSync(targetDir, { recursive: true, force: true })` then rethrow
     - Returns absolute target path
   - `uninstallSkill(skillName: string): Promise<void>`:
     - `rmSync(~/.claude/skills/<skillName>/, { recursive: true })`
     - Throws if directory does not exist

**Where**:
- `src/main/skills-allowlist.ts`
- `src/main/skills-installer.ts`

**Done when**:
- Both files compile with no TS errors
- `resolveTrustTier('anthropics', 'anything')` returns `'known'` (allowlist is empty in v1)
- `installSkill` imports without circular deps

---

### TASK-04 — IPC handlers & Preload

**Status**: Complete
**Parallel**: No
**Depends on**: TASK-01, TASK-03

**What**:

1. `src/main/ipc-handlers.ts`:

   Add imports at top:
   ```ts
   import { parseGitHubUrl, fetchRepoInfo, fetchSkillPreview, fetchDirectoryContents } from './github-api'
   import { TRUSTED_SOURCES, resolveTrustTier } from './skills-allowlist'
   import { installSkill, uninstallSkill } from './skills-installer'
   import { getSkillMeta, saveSkillMeta, removeSkillMeta, getAllSkillMeta } from './surreal-store'
   ```

   Add to the `workspaces:load-items` handler — enrich skills with SkillMeta:
   ```ts
   // After existing getAllAgentMeta() call, add:
   getAllSkillMeta()
   // Then build skillMetaMap and attach to each skill:
   const skillMetaMap = new Map(allSkillMeta.map(m => [m.skillName, m]))
   const skillViews = skills.map(s => ({
     ...s,
     meta: skillMetaMap.get(s.folderPath.split('/').pop() ?? '') ?? null
   }))
   // Return skillViews instead of skills
   ```

   Add new IPC handlers:
   - `skills:browse-sources` → returns `TRUSTED_SOURCES` (no API call — just the allowlist for v1 since it's empty; include the structure)
   - `skills:list-from-source` `(sourceId: string)` → find source in TRUSTED_SOURCES, call `fetchDirectoryContents`, filter dirs that contain SKILL.md (call `fetchSkillPreview` for each), cross-check `existsSync(~/.claude/skills/<folderName>/)` for `isInstalled`
   - `skills:preview-url` `(url: string)` → `parseGitHubUrl(url)` → if null: return `{ error: 'NOT_GITHUB' }`; else fetch `fetchSkillPreview` + `fetchRepoInfo` + `resolveTrustTier`; return `SkillPreview`
   - `skills:install` `(ref: GitHubRef, skillName: string)` → check `existsSync` first → if exists, return `{ conflict: true }`; else call `installSkill` → `saveSkillMeta` → return `{ success: true, installPath }`
   - `skills:uninstall` `(skillName: string)` → `uninstallSkill` → `removeSkillMeta` → return `{ success: true }`
   - `skills:get-meta` `(skillName: string)` → `getSkillMeta(skillName)`
   - `skills:get-all-meta` → `getAllSkillMeta()`

2. `src/preload/index.ts`:

   Add import of new types from `agent.ts`:
   ```ts
   import type { SkillMeta, GitHubRef, RemoteSkillCard, SkillSource, SkillPreview } from '../renderer/src/types/agent'
   ```

   Add `skills` namespace to `ElectronAPI` interface and implementation:
   ```ts
   skills: {
     browseSources: () => Promise<SkillSource[]>
     listFromSource: (sourceId: string) => Promise<RemoteSkillCard[]>
     previewUrl: (url: string) => Promise<SkillPreview | { error: string }>
     install: (ref: GitHubRef, skillName: string) => Promise<{ success?: boolean; conflict?: boolean; installPath?: string }>
     uninstall: (skillName: string) => Promise<{ success: boolean }>
     getMeta: (skillName: string) => Promise<SkillMeta | null>
     getAllMeta: () => Promise<SkillMeta[]>
   }
   ```

   Implementation mirrors existing patterns with `ipcRenderer.invoke(...)`.

**Where**:
- `src/main/ipc-handlers.ts`
- `src/preload/index.ts`

**Done when**:
- Both files compile with no TS errors
- `window.electronAPI.skills` is typed in the renderer
- `workspaces:load-items` returns `skills` with `meta` field populated when SkillMeta exists

---

### TASK-05 — CVA trust tier variants

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-01 and TASK-02)
**Depends on**: —

**What**: Extend `src/renderer/src/lib/variants.ts` with a `trustBadge` CVA variant:

```ts
export const trustBadge = cva('px-2 py-0.5 rounded-md text-[11px] font-medium border', {
  variants: {
    tier: {
      trusted:  'bg-emerald-950/40 border-emerald-800/40 text-emerald-300',
      known:    'bg-yellow-950/40  border-yellow-800/40  text-yellow-300',
      unknown:  'bg-red-950/40     border-red-800/40     text-red-300',
      local:    'bg-ag-surface-2   border-ag-border       text-ag-text-3',
    }
  },
  defaultVariants: { tier: 'local' }
})
```

Match the color system already used in the file (`ag-*` tokens + color-950/40 pattern from existing emerald usage in SkillDetailDrawer).

**Where**: `src/renderer/src/lib/variants.ts`

**Done when**:
- `trustBadge({ tier: 'trusted' })` returns a class string
- File compiles with no TS errors

---

### TASK-06 — SkillCard origin badge

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-07 and TASK-08)
**Depends on**: TASK-01, TASK-04, TASK-05

**What**: Extend `src/renderer/src/components/SkillCard.tsx`:

- `SkillCard` already receives `SkillItem` — after TASK-01 and TASK-04, this will have `meta?: SkillMeta | null`
- Add a small badge below the skill name (or alongside other badges in the card header area) showing the trust tier when `skill.meta` exists
- Badge text: `trusted` / `unverified` / `unknown` — use `trustBadge({ tier: skill.meta.trustTier })` from variants
- When `skill.meta` is null/undefined: show nothing (no badge = "Local")

Read `SkillCard.tsx` first to understand current layout before editing.

**Where**: `src/renderer/src/components/SkillCard.tsx`

**Done when**:
- Installed skill cards show the trust tier badge
- Local (non-installed) skill cards show no badge
- No layout breakage at 4-per-row grid

---

### TASK-07 — SkillDetailDrawer — Origin section + Uninstall

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-06 and TASK-08)
**Depends on**: TASK-01, TASK-04, TASK-05

**What**: Extend `src/renderer/src/components/SkillDetailDrawer.tsx`:

The drawer currently receives `skill: SkillItem | null`. After TASK-01, `SkillItem` has `meta?: SkillMeta | null` — use that directly (no new prop needed).

Add after the "Info" section:

1. **Origin section** (always shown):
   - `SectionHeader` with a `Link` or `Globe` lucide icon + label "Origin"
   - Info table row: `origin` → if `skill.meta`: show trust tier badge (`trustBadge`) + source URL as `<a>` (opens in browser via `window.open`) + install date formatted as locale date string
   - If no meta: show `"Local"` as plain text in `ag-text-3`

2. **Uninstall danger zone** (only when `skill.meta` exists):
   - At the bottom of the scrollable area, a danger zone div with a red border/background (mirror `WorkspaceDetailDrawer` danger zone pattern)
   - Header: "Uninstall skill"
   - Description: "Removes `~/.claude/skills/<folderName>/` permanently."
   - Two-step button: first click shows `"Click again to confirm"` state with a 3-second timeout to reset; second click calls `window.electronAPI.skills.uninstall(folderName)` → on success, calls `onClose()` and triggers canvas refresh

   **Canvas refresh after uninstall**: Accept an optional `onUninstalled?: () => void` prop. The parent (`AgentsRoom`) will pass a callback that reloads global workspace items.

**Where**: `src/renderer/src/components/SkillDetailDrawer.tsx`

**Done when**:
- Drawer shows "Origin" section for all skills
- Installed skills show trust badge + link + date
- Uninstall two-step works and removes the skill (verify folder gone)
- After uninstall, `onUninstalled` callback is called

---

### TASK-08 — BrowseSkillsPanel

**Status**: Complete
**Parallel**: Yes (`[P]` — runs alongside TASK-06 and TASK-07)
**Depends on**: TASK-01, TASK-04, TASK-05

**What**: Create `src/renderer/src/components/BrowseSkillsPanel.tsx`

**Panel structure** (mirrors TrashPanel — `fixed inset-0` overlay + `fixed right-0 w-[640px]` panel):

```
┌─────────────────────────────────┐
│ Header: "Browse Skills"  [×]   │
│ [Browse] [Install from URL]     │ ← tabs
├─────────────────────────────────┤
│ Tab content (scrollable)        │
└─────────────────────────────────┘
```

**Browse tab**:
- On mount: call `skills.browseSources()` → since allowlist is empty in v1, show an empty state: "No curated sources available yet. Use 'Install from URL' to install any skill from GitHub."
- This is intentional — the structure is in place for when sources are added

**Install from URL tab**:
- Text input: "Paste a GitHub URL…" with a "Preview" button
- State machine: `idle` → `loading` → `preview` | `error`
- **Preview card** (shown in `preview` state):
  - Skill name + description (from `SkillPreview.skill`)
  - File list
  - Trust tier badge (large, with label text):
    - `trusted`: green — "Trusted source"
    - `known`: yellow — "Unverified source — {stars} stars · {orgName ?? 'public repo'} · last updated {date}"
    - `unknown`: red — "Unknown source — Only install skills you trust."
  - For `unknown` tier: show an explicit warning checkbox "I understand this is an untrusted source"
  - "Install" button (disabled for `unknown` until checkbox checked)
- **Install flow**: `idle` → `installing` → `success` | `conflict` | `error`
  - `conflict` state: show "A skill named '{name}' is already installed." with "Overwrite" + "Cancel" buttons
  - Overwrite: calls `skills.uninstall` then `skills.install`
  - `success`: show success message; call `onInstalled()` prop to refresh canvas
- **Error states**:
  - `GH_NOT_FOUND`: "Skill not found at this URL."
  - `GH_RATE_LIMITED`: "GitHub rate limit reached. Try again at {time}." (format `resetAt` unix timestamp)
  - `GH_NO_SKILL_MD`: "No SKILL.md found in this folder."
  - `NOT_GITHUB`: "Only GitHub URLs are supported."
  - Network error: "Could not reach GitHub. Check your connection."

**Props**:
```ts
interface Props {
  onClose: () => void
  onInstalled: () => void  // called after successful install → parent reloads canvas
}
```

**Where**: `src/renderer/src/components/BrowseSkillsPanel.tsx`

**Done when**:
- Panel opens and closes
- Browse tab shows empty state (no sources yet)
- Install from URL: paste a real GitHub URL to a folder with SKILL.md → preview appears with correct trust tier
- Install button → skill appears in `~/.claude/skills/`
- Conflict handling works
- Rate limit and error states display correctly

---

### TASK-09 — Sidebar wiring & canvas refresh

**Status**: Complete
**Parallel**: No
**Depends on**: TASK-08

**What**: Wire `BrowseSkillsPanel` into the app.

Read `AgentsRoom.tsx` and `WorkspaceSidebar.tsx` first to find the right mounting point.

1. In `AgentsRoom.tsx` (or wherever the global workspace sidebar is rendered):
   - Add `browsePanelOpen: boolean` to local state
   - Render `<BrowseSkillsPanel>` when open (portal to `document.body` if needed — check if parent has overflow/transform that would clip it)
   - Pass `onInstalled` → callback that re-calls `loadItems` for the global workspace (same pattern as how trash restore refreshes canvas)

2. In `WorkspaceSidebar.tsx` (or the component rendering the global workspace section header):
   - Add a `Download` icon button (lucide-react) next to the skills section header or at the global workspace header level
   - Button label/tooltip: "Browse & install skills"
   - `onClick` → `onBrowseSkills()` prop (passed down from AgentsRoom)

**Where**:
- `src/renderer/src/components/AgentsRoom.tsx`
- `src/renderer/src/components/WorkspaceSidebar.tsx`

**Done when**:
- "Browse Skills" button visible in sidebar
- Clicking opens `BrowseSkillsPanel`
- After install, new skill card appears on canvas without full app reload

---

## Requirement Traceability

| Task | Covers |
|---|---|
| TASK-01 | Foundation for SKILL-01 through SKILL-05 |
| TASK-02 | SKILL-01 AC2, SKILL-02 AC1–AC2 |
| TASK-03 | SKILL-01 AC3, SKILL-02 AC3–AC5 |
| TASK-04 | SKILL-01 AC3–AC4, SKILL-02 AC6, SKILL-03 AC1, SKILL-05 AC3 |
| TASK-05 | SKILL-03 AC2 (visual trust tier) |
| TASK-06 | SKILL-03 AC2 (canvas badge) |
| TASK-07 | SKILL-03 AC2–AC4, SKILL-05 AC1–AC4 |
| TASK-08 | SKILL-01 AC1–AC6, SKILL-02 AC1–AC7, SKILL-04 AC1–AC3 |
| TASK-09 | SKILL-01 AC4 (canvas refresh), SKILL-05 AC4 |
