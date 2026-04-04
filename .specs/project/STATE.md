# State

## Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-04-03 | electron-vite as build tool | Best-in-class Electron + Vite integration; avoids manual process config |
| 2026-04-03 | v1 store: JSON file (not SurrealDB) | `surrealdb` npm v1 is WebSocket-only; `@surrealdb/node` (161MB) requires electron-rebuild. JSON at `~/.agents-room/store.json` is equally portable for v1. Plan `@surrealdb/node` for v2. |
| 2026-04-03 | Relationship detection: heuristic body scan | No frontmatter changes needed on existing agents; covers most real cases |
| 2026-04-03 | Linux: `--disable-gpu` + `--no-sandbox` flags | Required in envs without GPU acceleration. Via `app.commandLine.appendSwitch` before `app.whenReady()`. |
| 2026-04-03 | electron-vite uses `NO_SANDBOX=1` env var | `--no-sandbox` must be injected via `NO_SANDBOX=1` env var — electron-vite passes it to Electron spawn. In `"dev"` script. |
| 2026-04-03 | Multi-workspace architecture | Each workspace = group box on canvas; global workspace always present (id: `'global'`, path: `''`). Positions persisted in store.json. |
| 2026-04-03 | Logical trash | Items moved to `.claude/.trash/<type>s/`; metadata stored in store.json for restore; permanent delete only from trash. |
| 2026-04-03 | Skills: folder-based | `~/.claude/skills/<name>/SKILL.md` with frontmatter `name`, `description`, `model`, `disable-model-invocation`. |
| 2026-04-03 | Avatar storage: path copy + IPC data URL | Avatars copied to `~/.agents-room/avatars/<uuid>.<ext>`; path stored as `~/…` in store.json. Renderer loads via `avatar:read` IPC → returns `data:image/…;base64,…`. No `file://` or custom protocol needed. SVG blocked in picker (renders incorrectly), but existing SVGs still served. |
| 2026-04-03 | Store paths: `~/` relative format | All paths under `homedir()` stored as `~/…` in store.json; `homeDir` key records the machine's home at write time. Resolved to absolute at the store API boundary — callers always see absolute paths. Backward-compat: old absolute keys in agentMeta still resolved. |
| 2026-04-03 | Canvas positioning: programmatic pan on load | Removed `centerOnInit`; after first load completes, `setTransform` pans to top-left box + 80px padding. ⊙ button also uses `setTransform` (not `resetTransform`) to center on actual content. |
| 2026-04-03 | Drag delta divided by scale | WorkspaceGroupBox reads current zoom via `useTransformContext()` and divides mouse delta by `scale` so drag feels 1:1 at any zoom level. |
| 2026-04-03 | Card details: hover button, not direct click | Direct card click conflicted with canvas panning (any mousedown triggered panning start). Replaced with "Ver detalhes →" button that fades in on hover. |
| 2026-04-03 | Inter font via @fontsource/inter | Bundled offline via npm package (not Google CDN). Weights 400/500/600/700. Base font size 15px. |
| 2026-04-03 | Context menu: ReactDOM.createPortal | Menu rendered inside TransformComponent caused position offset when zoomed (CSS transforms break `position: fixed`). Portaled to `document.body`. |
| 2026-04-03 | CVA + system theme | `class-variance-authority` for `typeBadge` / `cardShell`; CSS custom properties in bare RGB channel format (`R G B`); `darkMode: 'media'` — automatic OS detection; `ag-*` token namespace. |
| 2026-04-03 | Snap-to-grid: 32px | Group box drag snaps to 32px grid (same as canvas background lines). Applied in `onMove` via `Math.round(v / 32) * 32`. |
| 2026-04-03 | Workspace editing in detail drawer only | All workspace actions (name, emoji, avatar, tags, delete) live in WorkspaceDetailDrawer. Sidebar row is read-only display + hover "Ver detalhes" bar. Prevents accidental delete. |
| 2026-04-03 | Emoji picker: portal | Sidebar has `overflow-y-auto` which clips absolutely-positioned popups and blocks pointer events. Emoji picker portaled to `document.body` with `getBoundingClientRect` for position. Same applies wherever emoji picker is used. |
| 2026-04-03 | Workspace detail: CLAUDE.md multi-location | Read checks `{workspacePath}/CLAUDE.md` then `{workspacePath}/.claude/CLAUDE.md`; returns first found + resolved path. Write targets whichever location already has the file; defaults to root. |
| 2026-04-03 | Workspace settings: read-only display | `.claude/settings.json` and `.claude/settings.*.json` listed and shown as formatted JSON — no editing (risk of corrupting Claude Code config). |
| 2026-04-03 | Duplicate workspace prevention | `addWorkspace` in store already deduplicates by path; `useWorkspaces` now also checks `entry.id` before pushing to React state. |
| 2026-04-03 | Workspace remove: two-step confirmation | Delete button in WorkspaceDetailDrawer requires a second confirmation click in a danger zone section. |

| 2026-04-04 | Brand accent: Honey Bronze `#C8922A` / `#E0A832` (dark) | council/session-010 round-02 consensus. CSS vars as bare RGB channels for Tailwind opacity modifiers. |
| 2026-04-04 | Neutral color system (no tints) | All `ag-*` surface/card tokens migrated to pure neutrals (neutral.950→neutral.100). Previous system had purple tints throughout. |
| 2026-04-04 | JetBrains Mono for code/mono | Added `@fontsource/jetbrains-mono`; base reset applies to `code/pre/kbd/samp`. |
| 2026-04-04 | All card backgrounds unified (same neutral) | `ag-card`, `ag-card-skill`, `ag-card-cmd` all map to same neutral. Type differentiation via top border color + type badge only. |
| 2026-04-04 | AgentCard as character card | Portrait header (64px, full-width, avatar or initial letter); name UPPERCASE bold; model badge as "class"; description italic; tools as abilities. Source badge removed from card — group already indicates workspace. |
| 2026-04-04 | SkillCard: name first, badges below | Name uppercase bold at top; skill/trust/model badges below; description italic. Consistent with AgentCard hierarchy. |
| 2026-04-04 | AvatarImg default `rounded="none"` | Straight-edge system. Added `fill` prop for portrait full-width use. Workspace/sidebar avatars: 40–44px with `border-2 border-accent/50`. |
| 2026-04-04 | Group header redesign | Avatar as left panel focal point; path always visible (`~/a/b`); tags inline; stats breakdown (N agents · N skills · N commands) color-coded on right. |
| 2026-04-04 | `handleSaveAgentMeta` bug fix | Was not calling `reloadWorkspace` after save → cards showed stale meta. Fixed + added missing `avatarPath` to saved meta. |
| 2026-04-04 | typeBadge: `text-[11px] font-medium` | Was `text-[10px] font-semibold`. Now follows brand guide label spec (11px / 500 / 0.02em tracking). |
| 2026-04-04 | `docs/brand/` created | Full brand guide in `docs/brand/`: BRAND.md, colors.md, typography.md, voice.md, iconography.md, logo.md, marketing.md + tokens/brand.config.ts + tokens/tailwind.preset.ts. |

| 2026-04-04 | Trusted Sources Registry implemented (P1) | Sources tab in BrowseSkillsPanel; userSources in store.json; sources:add/remove/update IPC; user-trusted tier (blue badge) |
| 2026-04-04 | Permissions Editor implemented (P1+P2) | PermissionsEditor component in WorkspaceDetailDrawer; structured Allow/Ask/Deny editor; tool picker with context-aware inputs; defaultMode dropdown; additionalDirectories; raw JSON fallback |

## Blockers

_None._

## Lessons

- `react-zoom-pan-pinch` `centerOnInit` centers the **content div** (6000×4000), not the workspace boxes inside it — boxes at (40,40) end up off-screen. Use programmatic `setTransform` after load instead.
- `position: fixed` elements inside a CSS-transformed ancestor are positioned relative to that ancestor, not the viewport. Always portal context menus.
- Even a simple mousedown/mouseup without drag triggers `onPanningStart`/`onPanningStop` in `react-zoom-pan-pinch` — using those events to gate card clicks blocks all clicks. Hover-button pattern avoids the issue entirely.
- `overflow-y-auto` on a container creates a new stacking context that clips `absolute` children AND blocks pointer events outside its bounds. Any popup (emoji picker, dropdown) inside an overflowed list must be portaled.
- Electron's `file://` protocol is blocked for paths outside the app directory in the renderer, even with `contextIsolation: true`. Custom `protocol.handle` works in production but can be blocked by CSP from the Vite dev server. Most reliable approach: read files in main process, return as base64 data URLs over IPC.
- Store paths stored as absolute become non-portable. Using `~/` prefix at write time and resolving at read time keeps the JSON human-readable and portable across users/machines.

## Todos

- [ ] Command detail view (show command content, usage)
- [ ] v2: Tag filtering on canvas (filter group boxes by workspace/item tags)
- [ ] v2: Search agents/skills/commands by name or model
- [ ] v2: Export canvas as PNG/SVG
- [ ] v2: Skill creation / editing from UI (create SKILL.md)
- [ ] Skills install API (install from GitHub URL or local folder into `~/.claude/skills/<name>/`)

## Deferred Ideas

- Cloud sync of ~/.agents-room/
- Agent execution interface (run agent from UI)
- Manual relationship overrides (drag to link)
- Agent dependency graph (DAG view)
- "What agents use tool X?" queries
- CLAUDE.md cards on canvas
- MCP server visualization
- Hooks management
- v2: Migrate store to @surrealdb/node for richer queries

## Preferences

_None recorded yet._
