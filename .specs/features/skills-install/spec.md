# Skills Install — Feature Specification

## Problem Statement

Claude Code skills are installed manually by copying files into `~/.claude/skills/<name>/`. There is no discovery mechanism, no way to browse available skills, and no safety signal to distinguish trustworthy sources from arbitrary files. Users who want to expand their skill library have no in-app path to do so.

## Goals

- [x] Allow users to discover and install skills from curated trusted sources without leaving the app
- [x] Allow users to install any skill directly from a GitHub URL, with explicit trust signals
- [x] Mark every installed skill with its origin so users know where it came from

## Out of Scope

| Feature | Reason |
|---|---|
| Creating / editing skills from UI | Separate feature (v2 todo) |
| Installing from local folder | Out of scope for this feature; local files can be copied manually |
| Auto-update of installed skills | v3 — requires version tracking and conflict resolution |
| Private / authenticated GitHub repos | v2 — requires OAuth flow |
| A community-managed public registry | Long-term commitment; out of scope for v1 of this feature |

---

## Trust Model

Skills come from one of three trust tiers. The UI communicates the tier clearly at every step.

| Tier | Definition | UI signal |
|---|---|---|
| **Trusted** | Source is in the app's hardcoded allowlist | Green "Trusted source" badge |
| **Known** | Not in allowlist, but is a public GitHub repo/org with visible metadata (stars, org) | Yellow "Unverified source" badge + star count + org name |
| **Unknown** | Any other URL (raw file, non-GitHub host, etc.) | Red warning — explicit confirmation required |

The allowlist ships with the app and includes only sources that have been manually vetted (starting with the Anthropic org on GitHub if/when an official skills repo exists). Users cannot edit the allowlist — it is updated via app releases.

---

## User Stories

### P1: Browse and install skills from trusted sources [SKILL-01] ⭐ MVP

**User Story**: As a Claude Code user, I want to browse skills from trusted sources and install them with one click, so I can expand my skill library without manually copying files.

**Why P1**: Core value of the feature. Without this, there is nothing to discover.

**Acceptance Criteria**:

1. WHEN user opens the "Browse Skills" panel THEN system SHALL display a list of trusted sources from the allowlist
2. WHEN user selects a source THEN system SHALL fetch its skill listings via GitHub API and display them as cards (name, description, model hint if present)
3. WHEN user clicks "Install" on a skill card THEN system SHALL download all files from that skill's folder into `~/.claude/skills/<name>/`
4. WHEN install completes THEN system SHALL show a success state on the card and the skill SHALL appear in the canvas immediately (or on next reload)
5. WHEN a skill with the same name is already installed THEN system SHALL warn the user and ask to overwrite or cancel
6. WHEN the GitHub API is unreachable THEN system SHALL show an error state with a retry option

**Independent Test**: Open panel → select a trusted source → install a skill → verify folder exists in `~/.claude/skills/` and card appears in canvas.

---

### P1: Install a skill from any GitHub URL [SKILL-02] ⭐ MVP

**User Story**: As a Claude Code user, I want to paste a GitHub URL pointing to a skill folder and install it directly, so I can install skills I found outside the app.

**Why P1**: Direct URL install is the escape hatch for any skill not in the curated list. Without it, the feature is incomplete.

**Acceptance Criteria**:

1. WHEN user pastes a GitHub URL (repo root, subfolder, or raw file) THEN system SHALL resolve it to a skill folder and display a preview (name, file list, trust tier badge)
2. WHEN the URL resolves to a GitHub repo/org THEN system SHALL fetch and display trust signals: star count, org name, last updated
3. WHEN the source is in the allowlist THEN system SHALL show "Trusted source" badge
4. WHEN the source is a public GitHub repo not in the allowlist THEN system SHALL show "Unverified source" badge with metadata
5. WHEN the source is non-GitHub or a raw URL THEN system SHALL show a red warning: "This source is unknown. Only install skills you trust."
6. WHEN user confirms install THEN system SHALL download and install the skill (same mechanism as P1 story 1)
7. WHEN URL is invalid or does not contain a `SKILL.md` THEN system SHALL show a clear error explaining what was expected

**Independent Test**: Paste a GitHub URL for a known skill folder → see preview with trust tier → install → verify in `~/.claude/skills/`.

---

### P1: Origin marking on installed skills [SKILL-03] ⭐ MVP

**User Story**: As a Claude Code user, I want to see where each skill came from on its canvas card and detail drawer, so I can audit and trust what's running in my Claude Code environment.

**Why P1**: Without origin marking, the install feature creates invisible provenance — users can't tell which skills were manually placed vs. installed and from where.

**Acceptance Criteria**:

1. WHEN a skill is installed via this feature THEN system SHALL persist its origin (source URL, trust tier, install date) in `store.json` under `skillMeta`
2. WHEN a skill card is rendered on the canvas THEN system SHALL show a small origin badge (trusted / unverified / unknown) if origin metadata exists
3. WHEN user opens the skill detail drawer THEN system SHALL show a full origin section: source URL (clickable), trust tier, install date
4. WHEN a skill has no origin metadata (manually placed) THEN system SHALL show "Local" as origin — no badge
5. WHEN user uninstalls a skill (via existing trash/delete flow) THEN system SHALL remove its origin metadata from `store.json`

**Independent Test**: Install a skill from URL → open its detail drawer → verify origin section shows correct source, tier, and date.

---

### P2: See which skills are already installed in the Browse panel [SKILL-04]

**User Story**: As a Claude Code user, I want the browse panel to show which skills I already have installed, so I don't install duplicates.

**Acceptance Criteria**:

1. WHEN browse panel loads THEN system SHALL cross-reference listed skills with `~/.claude/skills/` and `store.json`
2. WHEN a skill is already installed THEN system SHALL show "Installed" state on its card instead of "Install" button
3. WHEN an installed skill's source differs from the current source listing THEN system SHALL show "Installed (different source)" warning

**Independent Test**: Install a skill → reopen browse panel → verify card shows "Installed" state.

---

### P2: Uninstall skills from the detail drawer [SKILL-05]

**User Story**: As a Claude Code user, I want to uninstall a skill from its detail drawer, so I can remove skills I no longer need.

**Acceptance Criteria**:

1. WHEN user opens a skill detail drawer THEN system SHALL show an "Uninstall" button (only for skills with origin metadata — i.e., installed via this feature)
2. WHEN user clicks "Uninstall" THEN system SHALL show a confirmation dialog
3. WHEN user confirms THEN system SHALL delete `~/.claude/skills/<name>/` and remove origin metadata from `store.json`
4. WHEN uninstall completes THEN system SHALL remove the skill card from the canvas immediately

**Independent Test**: Install a skill → open detail drawer → uninstall → verify folder removed and card gone from canvas.

---

## Edge Cases

- WHEN GitHub API rate limit is hit (60 req/hour unauthenticated) THEN system SHALL show "Rate limit reached. Try again in X minutes." with the reset time from response headers
- WHEN a skill folder contains files other than `.md` (images, scripts) THEN system SHALL download all files in the folder as-is
- WHEN skill name conflicts with a manually-placed skill (no origin in store) THEN system SHALL warn: "A skill named X already exists and was not installed via this app."
- WHEN install is interrupted mid-download THEN system SHALL clean up the partial folder
- WHEN a GitHub URL points to a repo root with multiple skill folders THEN system SHALL ask user which folder to install (or list all with checkboxes)
- WHEN `~/.claude/skills/` does not exist THEN system SHALL create it before writing

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SKILL-01 | P1: Browse trusted sources | Execute | Done |
| SKILL-02 | P1: Install from URL | Execute | Done |
| SKILL-03 | P1: Origin marking | Execute | Done |
| SKILL-04 | P2: Already installed state | Execute | Done |
| SKILL-05 | P2: Uninstall from drawer | Execute | Done |

---

## Success Criteria

- [x] User can browse a trusted source, install a skill, and see it on the canvas in one flow without leaving the app
- [x] Every installed skill has a visible, auditable origin
- [x] Installing from an unverified URL requires explicit user acknowledgment of the risk
- [x] GitHub API errors never leave a broken install state
