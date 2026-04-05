# Changelog

All notable changes to Agents Room are documented here.

---

## [0.3.0] — 2026-04-04

### Added

- **Agent image generation** — generate avatar portraits and card background images using Google Gemini Imagen (`imagen-3.0-generate-fast-001`) directly from the agent detail drawer. Generated images are saved to `~/.agents-room/avatars/` and displayed on the agent card with a dark overlay for readability.
- **AI-assisted agent creation** — new "Create Agent" drawer with an AI toggle; describe what you want and Claude generates name, description, model, tools list, and system prompt body. Accessible via the "+" button on the Agents subgroup header in each group box.
- **AI-assisted skill creation** — AI toggle in `CreateSkillDrawer`; generates name, description, model, and SKILL.md body from a description.
- **AI-assisted command creation** — AI toggle in `CreateCommandDrawer`; generates name and command body from a description.
- **AI badge** — generated fields show an "AI" badge next to their label; badge clears automatically when the field is manually edited.
- **Settings drawer** — gear icon in the main toolbar opens a unified settings panel with three sections: Google Gemini API key (for image generation), Anthropic API key (for AI-assisted creation), and GitHub token (for skill install rate limits / private repos).
- **Encrypted API key storage** — Gemini and Anthropic keys stored in `~/.agents-room/settings.json` using Electron `safeStorage` (`enc:<base64>` with `plain:` fallback). GitHub token was already encrypted; now all three keys use the same pattern.

### Changed

- **GitHub token configuration moved to Settings drawer** — previously in a standalone `GitHubTokenModal` reachable only from the Browse Skills panel. Now accessible from the main Settings drawer (gear icon). The KeyRound button in Browse Skills now opens Settings directly.
- GitHub token and all API keys are now encrypted at rest via `safeStorage` — no plaintext secrets in any config file.

---

## [0.2.0] — 2026-04-04

### Added

- **Skill / command creation from UI** — create new skills (`~/.claude/skills/<name>/SKILL.md`) and commands (global or workspace-scoped) directly from the app, without touching the filesystem. "+" button on Skills and Commands subgroup headers in each group box.
- **Inline skill editor** — edit description, model, disable-model-invocation toggle, and body inside the skill detail drawer. Name is read-only to prevent folder rename side effects.
- **Inline command editor** — edit command body inside the command detail drawer.
- **Duplicate & Edit for installed skills** — installed skills show "Duplicate & Edit" instead of Edit; creates `<name>-copy/` preserving the original and stripping origin metadata from the copy.
- **Command detail view** — full `.md` content rendered as Markdown in a detail drawer; body field added to `CommandItem`.
- **Tag filtering** — filter bar in the sidebar; groups visible if workspace tags or agent tags match; multi-select OR logic; highlighted card flash on match.
- **Global search (Ctrl+K)** — modal search across all agents, skills, and commands by name, description, model, tools, and tags; "Go to" pans canvas and flashes the card; "Details" opens the drawer; full keyboard navigation (↑↓ Enter Esc).

### Changed

- Skills and Commands subgroup headers now always render (even when count is 0) when a workspace is active, so the "+" button is always accessible.
- Unsaved-changes confirmation added to skill/command create and edit drawers.

---

## [0.1.2] — 2026-04-04

### Changed
- Removed macOS build target — macOS distribution requires a paid Apple Developer account for code signing. Windows and Linux are fully supported.

---

## [0.1.1] — 2026-04-04

### Added
- **Semantic versioning + auto-updater** — `electron-updater` checks for new releases on startup and downloads them in the background. Users see download progress and can install with one click from the About modal.
- **About & Updates modal** — accessible from the sidebar footer. Shows current version, update status, progress bar during download, and Install & Restart button when ready.
- **Release scripts** — `yarn release:patch / release:minor / release:major` bump the version, create a git tag, and push. GitHub Actions picks up the tag and builds automatically.
- **Cross-platform release pipeline** — GitHub Actions builds Windows (NSIS installer + portable) and Linux (AppImage, deb, rpm) artifacts and publishes them as a GitHub release.

---

## [0.1.0] — 2026-04-04

Initial release of Agents Room — a visual canvas for Claude Code agent teams.

### Canvas

- **Multi-workspace canvas** — each project folder becomes a draggable group box on an infinite pan/zoom canvas. Positions are persisted across sessions.
- **Agent cards** — character-card layout with portrait avatar, name, model badge, description, and tools list. Reads directly from `.claude/agents/*.md` files using frontmatter + gray-matter.
- **Skill cards** — reads `~/.claude/skills/<name>/SKILL.md`; shows name, trust tier, model, and description.
- **Command cards** — reads `~/.claude/commands/*.md` slash commands.
- **Relationship detection** — heuristic body scan finds agent-to-agent mentions without modifying any files.
- **Snap-to-grid drag** — group boxes snap to a 32px grid matching the canvas background.
- **Zoom controls** — react-zoom-pan-pinch with dot grid; ⊙ button centers on content; drag accuracy maintained at all zoom levels.
- **Context menu** — right-click any card for copy / duplicate / move to trash. Portal-rendered so it stays pixel-accurate at any zoom level.

### Agent detail drawer

- Full prompt body rendered as Markdown.
- Frontmatter table (model, tools, temperature, etc.).
- Relationships panel — which agents reference this one.
- Editable notes, tags, and avatar (copied to `~/.agents-room/avatars/`, served as base64 data URLs over IPC).
- Auto-saves tags and avatar on change without requiring a Save button press.

### Skill detail drawer

- SKILL.md body rendered as Markdown.
- Trust tier badge (official / user-trusted / unknown).
- Origin badge showing source repo.
- Uninstall with confirmation.

### Workspace management

- **Sidebar** — lists workspaces with avatar, display name, path, and tags. Hover reveals a details button.
- **Workspace detail drawer** — edit display name, emoji, avatar, tags. Includes CLAUDE.md editor (reads `{workspace}/CLAUDE.md` or `{workspace}/.claude/CLAUDE.md`, writes to whichever exists). Settings viewer shows `.claude/settings.json` and `settings.*.json` as read-only formatted JSON.
- **Global workspace** — always present; reads from `~/.claude/`.
- **Duplicate prevention** — deduplicates by path on add.
- **Two-step delete confirmation** — danger zone section requires a second click.

### Skills install

- **Browse panel** — lists official and user-trusted skill sources.
- **GitHub install** — paste any GitHub URL pointing to a skill folder; previews SKILL.md before installing into `~/.claude/skills/<name>/`.
- **Trusted Sources Registry** — add custom GitHub repos as trusted sources; stored in `~/.agents-room/store.json`; shown with a user-trusted tier badge.
- **GitHub token** — configurable PAT for higher rate limits; stored in the local store (never in plaintext env vars); masked in the UI.
- **Uninstall** — removes the skill folder and clears metadata.

### Permissions editor

- Structured Allow / Ask / Deny editor for `.claude/settings.json` permission rules.
- Tool picker with context-aware input (path picker for Bash, pattern fields for Edit/Write/Read).
- `defaultMode` dropdown.
- `additionalDirectories` manager.
- Raw JSON fallback view.

### Logical trash

- Items moved to `.claude/.trash/<type>s/` instead of deleted.
- Restore with missing-directory warning.
- Permanent delete from the trash panel.

### Design system

- **Honey Bronze accent** (`#C8922A` light / `#E0A832` dark) — CSS custom properties in bare RGB channel format for Tailwind opacity modifiers.
- **Neutral color system** — all surface tokens use pure neutrals; no tinted grays.
- **Inter** (UI) + **JetBrains Mono** (code) — bundled via `@fontsource`, no CDN dependency.
- **CVA + system theme** — `class-variance-authority` for component variants; `darkMode: 'media'` for automatic OS dark/light detection; `ag-*` token namespace.
- **`docs/brand/`** — full brand guide: colors, typography, voice, iconography, logo, marketing.

### Storage

- JSON store at `~/.agents-room/store.json` — workspaces, canvas positions, agent metadata, skill metadata, user-trusted sources, GitHub token.
- Paths stored in `~/`-relative format for portability across machines and users.
- Backward-compatible: old absolute paths are resolved transparently.
