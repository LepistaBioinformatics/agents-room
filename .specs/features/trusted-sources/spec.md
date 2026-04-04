# Trusted Sources Registry — Feature Specification

## Problem Statement

The skill Browse panel currently only shows sources from a hardcoded allowlist (`skills-allowlist.ts`). Users who maintain their own GitHub repos of skills — or who trust specific community repos — have no way to add them as browsable sources. They must use the "Install from URL" tab and re-paste the URL every time, losing the convenience of the curated browsing experience.

## Goals

- [x] Users can register their own GitHub repos as trusted sources, making them appear in the Browse tab alongside the official list
- [x] User-added sources are persisted in `store.json` and survive app restarts
- [x] The trust model clearly distinguishes app-shipped sources (hardcoded) from user-added ones
- [x] Users can remove sources they no longer need

## Out of Scope

| Feature | Reason |
|---|---|
| Non-GitHub sources (npm, local path) | Out of scope for v2; complexity of fetching from non-GitHub hosts |
| Source order / priority editing | Nice-to-have, deferred |
| Import / export source list | Deferred |
| Per-workspace source overrides | All sources are global; workspace scoping deferred |
| Private / authenticated repos as sources | OAuth flow is a separate feature |

---

## Trust Model (Updated)

| Tier | Source | UI signal |
|---|---|---|
| **Official** | Hardcoded in `skills-allowlist.ts` | Green "Official" badge |
| **User Trusted** | User added via this feature | Blue "Trusted by you" badge |
| **Known** | Public GitHub repo, not in either list | Yellow "Unverified" badge + metadata |
| **Unknown** | Non-GitHub or unresolvable URL | Red warning |

---

## User Stories

### P1: Manage trusted sources in a dedicated panel [TSRC-01] ⭐ MVP

**User Story**: As a Claude Code user, I want to open a "Manage Sources" panel where I can add and remove trusted GitHub repos as skill sources, so I can browse skills from repos I trust without re-pasting URLs every time.

**Why P1**: Without this, there is no user-facing entry point for the feature. Everything else builds on it.

**Acceptance Criteria**:

1. WHEN user opens the Browse Skills panel THEN a "Manage Sources" button SHALL be visible in the header or as a tab
2. WHEN user opens Manage Sources THEN system SHALL list all current sources, grouped as "Official" and "User-added"
3. WHEN user clicks "Add Source" THEN system SHALL show an input field for a GitHub URL (repo root or sub-folder)
4. WHEN user submits a valid GitHub URL THEN system SHALL resolve it into a `SkillSource` record (owner, repo, path, branch) and add it to the user sources list in `store.json`
5. WHEN a source is added THEN it SHALL immediately appear in the Browse tab source selector
6. WHEN user clicks Remove on a user-added source THEN system SHALL ask for confirmation, then remove it from `store.json` and the Browse tab
7. WHEN user tries to add an official source URL that is already in the hardcoded list THEN system SHALL show "This source is already in the official list"

**Independent Test**: Add a valid GitHub URL as a source → close and reopen Browse panel → source appears in selector → install a skill from it → remove the source → it's gone from Browse.

---

### P1: User-added sources appear in Browse tab with correct trust tier [TSRC-02] ⭐ MVP

**User Story**: As a Claude Code user, I want user-added sources to appear in the same Browse tab as official sources, with a clear visual distinction, so I can install from them without switching to the URL tab.

**Why P1**: This is the payoff of TSRC-01. Without this, adding a source has no effect on the browsing experience.

**Acceptance Criteria**:

1. WHEN Browse tab loads THEN system SHALL merge official sources and user-added sources into the source list
2. WHEN a user-added source is selected THEN system SHALL display a blue "Trusted by you" badge instead of the green official badge
3. WHEN skills are fetched from a user-added source THEN the install flow SHALL work identically to official sources
4. WHEN a skill is installed from a user-added source THEN origin metadata SHALL record tier as `user-trusted`
5. WHEN the source cannot be fetched (GitHub error) THEN system SHALL show the same error states as for official sources

**Independent Test**: Add a source → select it in Browse tab → see "Trusted by you" badge → install a skill → open skill detail → origin shows "user-trusted".

---

### P2: Validate URL and show source preview before adding [TSRC-03]

**User Story**: As a Claude Code user, I want to see a preview of a source (name, skill count estimate, repo metadata) before confirming I want to add it, so I don't accidentally add a broken or empty repo.

**Acceptance Criteria**:

1. WHEN user types a GitHub URL in the Add Source field and presses Enter or clicks Preview THEN system SHALL resolve the URL and show repo name, description, star count, and estimated skill count (number of subfolders with SKILL.md)
2. WHEN the URL is invalid or the repo has no skill-like subfolders THEN system SHALL show a warning message (not block the add — user may want to add anyway)
3. WHEN user confirms after preview THEN system SHALL add the source with the resolved metadata (name from repo description or repo name)

**Independent Test**: Type a valid repo URL → see preview card → confirm → source added with name from repo.

---

### P2: Edit source display name and description [TSRC-04]

**User Story**: As a Claude Code user, I want to rename a user-added source with a friendly label, so the Browse tab shows something more meaningful than the GitHub repo name.

**Acceptance Criteria**:

1. WHEN user opens a source's detail (edit mode in Manage Sources) THEN system SHALL allow editing `name` and `description` fields
2. WHEN user saves THEN changes SHALL be persisted in `store.json` and reflected in the Browse tab immediately

**Independent Test**: Add a source → edit its name → see updated name in Browse tab.

---

## Edge Cases

- WHEN GitHub API rate limit is hit while resolving a URL THEN system SHALL show rate limit error with reset time and offer to set a token
- WHEN user adds the same GitHub URL twice THEN system SHALL detect the duplicate (same owner/repo/path) and show "Source already added"
- WHEN a user-added source returns no folders with SKILL.md THEN Browse panel SHALL show "No skills found in this source" (not an error)
- WHEN `store.json` is corrupted THEN user sources SHALL fail gracefully and default to official list only

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TSRC-01 | P1: Manage sources panel | — | Done |
| TSRC-02 | P1: Sources in Browse tab with tier | — | Done |
| TSRC-03 | P2: URL validation + preview | — | Deferred |
| TSRC-04 | P2: Edit source name | — | Deferred |

---

## Success Criteria

- [x] User can add a GitHub repo URL as a source and browse its skills without re-pasting the URL
- [x] Official and user-added sources are visually distinct at every step
- [x] Sources persist across app restarts
- [x] Removing a source is immediate (hover × button, no confirmation for simplicity)
