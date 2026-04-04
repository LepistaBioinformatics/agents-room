# Agents Room

> A visual command center for everyone running multi-agent teams with Claude Code.

If you use Claude Code across multiple projects, you already know how fast things get out of hand. Agents scattered across repositories. No way to see which agent calls which. Settings files edited by hand. GitHub tokens stored in plain text. Agents Room fixes all of that — in one desktop app, on your machine, completely offline.

---

<!-- SCREENSHOT: Full canvas view showing multiple workspace boxes with agent cards, connection lines, and the system node -->
![Canvas Overview](.github/screenshots/canvas-overview.png)

---

## Why Agents Room?

### You have agents. Lots of them. Organized in... files.

Claude Code agents live in `.claude/agents/` folders. Every project has its own. Some agents are global. Some call other agents. As your team and toolset grows, you end up with dozens of markdown files spread across your machine — and zero visibility into how they relate to each other.

Agents Room gives you back that visibility.

### One canvas. Every workspace. Every agent.

Open the app and see every Claude Code workspace on your machine laid out on a single, zoomable canvas. Each workspace is a draggable group. Each agent is a card. Relationships between agents — agent A calls agent B? — are drawn as connection lines automatically, without any configuration.

<!-- SCREENSHOT: Zoomed-in view of agent cards inside a workspace group box, showing model badges, tools, tags, and connection arrows -->
![Workspace Detail](.github/screenshots/workspace-detail.png)

---

## What Makes It Different

### Annotations without touching your files

You can add notes, tags, and avatars to any agent — without modifying the `.md` file. Your notes are stored separately in `~/.agents-room/store.json`. The agent files stay exactly as they are. Commit them, share them, and your personal context stays on your machine.

### Relationship detection — automatic

Agents Room scans every agent's body and description, detects mentions of other agent names by word boundary, and draws directed connection lines on the canvas. No YAML to update. No graph to maintain. It just works.

<!-- SCREENSHOT: Connection lines between agents, highlighting an orchestrator agent connected to multiple sub-agents -->
![Agent Relationships](.github/screenshots/agent-relationships.png)

### Your GitHub token — encrypted, not exposed

To browse and install skills from GitHub, Agents Room optionally uses a Personal Access Token for higher API rate limits. That token is stored using your OS's native credential store:

- **macOS** → Keychain
- **Windows** → DPAPI
- **Linux** → libsecret (system keyring)

It never touches the network except to call GitHub's own API. It's masked in the UI (shows only first + last 4 characters). You can clear it at any time.

<!-- SCREENSHOT: GitHub Token modal showing the masked token field and encrypted storage notice -->
![GitHub Token](.github/screenshots/github-token.png)

### Skill installation with trust tiers

When installing Claude Code skills, you need to know where they come from. Agents Room shows you clearly:

| Badge | Meaning |
|-------|---------|
| **Trusted** (green) | Official Anthropic skills |
| **Known** (yellow) | Public GitHub repo with stars and org info |
| **Unknown** (red) | Raw URL or non-GitHub host — you must confirm |

Every installed skill records its source URL, owner, repo, branch, trust tier, and install date. You can audit everything from the detail drawer.

<!-- SCREENSHOT: Skills browser showing trust tier badges — green Trusted, yellow Known, red Unknown -->
![Skill Trust Tiers](.github/screenshots/skill-trust-tiers.png)

### Trash, not delete

Removed agents and skills don't disappear. They go to a recoverable trash folder (`.claude/.trash/`) with full metadata. You can restore them to their original location or permanently delete them — with a two-step confirmation.

### Portable by design

All paths in `store.json` are stored relative to your home directory (`~/...`). Move `~/.agents-room/` to another machine and everything — workspace positions, annotations, skill metadata — comes with you.

---

## Features at a Glance

- **Multi-workspace canvas** — drag, pan, zoom across all your Claude Code projects
- **Agent cards** — name, model badge (Opus / Sonnet / Haiku), description, tools, tags, avatar
- **Auto relationship lines** — heuristic detection, no setup required
- **Annotations** — notes, tags, custom avatars stored outside your agent files
- **CLAUDE.md viewer** — read workspace instructions inline
- **Skill browser** — browse, install, and track skills with trust tier badges
- **Encrypted token storage** — OS keychain-backed GitHub token, never plain text
- **Trash & restore** — safe deletion with full recovery
- **Fully local** — no cloud sync, no account, no telemetry

---

## Installation

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later

### Clone and install

```bash
git clone https://github.com/your-org/agent-room-ui.git
cd agent-room-ui
npm install
```

### Run in development mode

```bash
npm run dev
```

> **Linux users:** The app already sets `NO_SANDBOX=1` and `--disable-gpu` automatically. No extra steps needed.

### Build a production binary

```bash
npm run build
```

The packaged app will be in the `dist/` folder.

```bash
# Or build unpacked (no installer, faster iteration)
npm run build:unpack
```

---

## Usage

### Adding a workspace

1. Launch the app — your global `~/.claude/` workspace is always there by default.
2. Click **Add Workspace** and pick any project folder.
3. Agents Room scans for `.claude/agents/`, `.claude/skills/`, and `.claude/commands/` automatically.

<!-- SCREENSHOT: Add workspace dialog and the workspace appearing on the canvas -->
![Add Workspace](.github/screenshots/add-workspace.png)

### Navigating the canvas

| Action | How |
|--------|-----|
| Pan | Click and drag on empty canvas |
| Zoom | Mouse wheel or trackpad pinch |
| Reset view | Click the center button in the toolbar |
| Move a workspace | Drag its header bar |

### Viewing an agent

Click any agent card to open the detail drawer. You'll see:

- Full frontmatter fields (model, tools, etc.)
- Complete markdown body with syntax highlighting
- Notes and tags (yours, not the file's)
- Skill origin and provenance (for skills)

<!-- SCREENSHOT: Detail drawer open on the right side showing agent metadata, description, and annotation fields -->
![Agent Detail](.github/screenshots/agent-detail.png)

### Managing a GitHub Token

1. Open **Settings → GitHub Token**
2. Paste your Personal Access Token (needs `public_repo` scope for rate limits)
3. The token is encrypted and saved immediately
4. To remove it, click **Clear Token**

### Installing a skill

1. Open the **Skills** panel
2. Browse from the trusted Anthropic catalog, or paste any GitHub URL
3. Review the trust tier badge before confirming
4. The skill is installed to your selected workspace's `.claude/skills/` folder

---

## Where data is stored

| Data | Location |
|------|----------|
| App config + annotations | `~/.agents-room/store.json` |
| Agent avatars | `~/.agents-room/avatars/` |
| Global agents | `~/.claude/agents/` |
| Workspace agents | `<project>/.claude/agents/` |
| Trash | `.claude/.trash/` inside each workspace |

Nothing is sent externally. GitHub API calls are made only when you use the skill browser, and only from your machine using your own token.

---

## Project Status

Agents Room is in active development. The canvas, workspace management, agent display, annotations, and skill browser are functional today (v1 MVP). Planned next:

- Agent file editing from within the app
- Filtering and search across all workspaces
- DAG view for deeper relationship exploration
- Export canvas as image

---

## Contributing

Issues and pull requests welcome. If you find a bug or have a feature idea, open an issue and describe your setup — OS, how many workspaces you have, and what you expected to happen.

---

## License

MIT
