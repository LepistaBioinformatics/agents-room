# UI Foundation — Design

## Component Architecture

### New files

```
src/renderer/src/
├── i18n/
│   ├── index.ts                    # i18next init + useT re-export
│   └── locales/
│       └── en-US.json              # All user-facing strings
└── components/
    └── ui/
        ├── DrawerShell.tsx         # Backdrop + container + Escape handler
        ├── SectionBlock.tsx        # Section wrapper + header
        ├── InfoTable.tsx           # Key-value table
        └── DangerZone.tsx          # Two-step destructive action
```

### Modified files

Every component with hardcoded strings. The 3 drawers also lose their inline structure in favor of the new primitives.

---

## Primitive Specifications

### `DrawerShell`

```tsx
interface DrawerShellProps {
  onClose: () => void
  width?: string          // Tailwind width classes, default: 'w-[90%] sm:w-1/2'
  children: React.ReactNode
}
```

Renders:
```tsx
<>
  <div className="fixed inset-0 bg-black/50 animate-fade-in" style={{ zIndex: 40 }} onClick={onClose} />
  <div className={`fixed right-0 top-0 flex h-full ${width} flex-col bg-ag-surface border-l border-ag-border shadow-2xl animate-slide-in overflow-hidden`} style={{ zIndex: 50 }}>
    {children}
  </div>
</>
```

Escape handler via `useEffect`.

**Usage in BrowseSkillsPanel**: pass `width="w-[640px]"`.

---

### `SectionBlock`

```tsx
interface SectionBlockProps {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  noBorder?: boolean      // omit the bottom border (for last sections)
}
```

Renders:
```tsx
<div className={cn('px-6 py-5', !noBorder && 'border-b border-ag-border')}>
  <div className="flex items-center gap-2">
    <span className="text-ag-text-2">{icon}</span>
    <span className="text-xs font-semibold uppercase tracking-wider text-ag-text-2">{label}</span>
  </div>
  <div className="mt-3">{children}</div>
</div>
```

---

### `InfoTable`

```tsx
interface InfoTableRow {
  key: string
  value: React.ReactNode
  mono?: boolean          // whether value is monospace (default false)
}

interface InfoTableProps {
  rows: InfoTableRow[]
}
```

Renders:
```tsx
<div className="rounded-xl border border-ag-border bg-ag-surface-2 divide-y divide-ag-border overflow-hidden">
  {rows.map(({ key, value, mono }) => (
    <div key={key} className="flex gap-4 px-4 py-2.5 text-xs">
      <span className="w-32 shrink-0 font-mono text-ag-text-3">{key}</span>
      <span className={cn(mono ? 'font-mono' : '', 'text-ag-text-2 break-all')}>{value}</span>
    </div>
  ))}
</div>
```

---

### `DangerZone`

```tsx
interface DangerZoneProps {
  title: string
  description: React.ReactNode
  buttonLabel: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  busy?: boolean
  confirmTimeout?: number   // ms before confirm state resets, default 3000
}
```

Internal state: `confirming: boolean`. First click sets `confirming = true` and schedules reset after `confirmTimeout`. Second click (while `confirming`) calls `onConfirm`.

Renders:
```tsx
<div className="mx-6 mb-6 mt-2 rounded-xl border border-red-900/40 bg-red-950/20 px-5 py-4">
  <div className="text-xs font-semibold uppercase tracking-wider text-red-500/70 mb-1">{title}</div>
  <p className="text-xs text-ag-text-3 mb-3">{description}</p>
  <button
    onClick={handleClick}
    disabled={busy}
    className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 disabled:opacity-50 transition-colors"
  >
    {busy ? '…' : confirming ? confirmLabel : buttonLabel}
  </button>
</div>
```

---

## i18n Structure

### `src/renderer/src/i18n/index.ts`

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enUS from './locales/en-US.json'

i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  resources: { 'en-US': { translation: enUS } },
  interpolation: { escapeValue: false }
})

export default i18n
export { useTranslation as useT } from 'react-i18next'
```

Import in `src/renderer/src/main.tsx` (side-effect import: `import './i18n'`).

---

### `en-US.json` structure

```json
{
  "common": {
    "save": "Save",
    "saving": "Saving…",
    "saved": "Saved!",
    "cancel": "Cancel",
    "close": "Close",
    "loading": "Loading…",
    "install": "Install",
    "installing": "Installing…",
    "installed": "Installed",
    "uninstall": "Uninstall",
    "uninstalling": "Uninstalling…",
    "overwrite": "Overwrite",
    "preview": "Preview",
    "add": "Add",
    "remove": "Remove",
    "delete": "Delete",
    "restore": "Restore",
    "duplicate": "Duplicate",
    "clickToConfirm": "Click again to confirm"
  },
  "nav": {
    "agentsRoom": "Agents Room",
    "openSidebar": "Open sidebar",
    "closeSidebar": "Close sidebar",
    "reloadAll": "Reload all",
    "trash": "Trash",
    "workspaces": "Workspaces",
    "browseInstallSkills": "Browse & install skills"
  },
  "stats": {
    "workspaceCount_one": "{{count}} workspace",
    "workspaceCount_other": "{{count}} workspaces",
    "itemCount_one": "{{count}} item",
    "itemCount_other": "{{count}} items"
  },
  "card": {
    "viewDetails": "View details →",
    "skill": "skill",
    "cmd": "cmd",
    "agent": "agent"
  },
  "contextMenu": {
    "duplicate": "Duplicate",
    "copyToWorkspace": "Copy to workspace",
    "moveToTrash": "Move to trash"
  },
  "canvas": {
    "resetView": "Reset view",
    "agents": "Agents",
    "skills": "Skills",
    "commands": "Commands",
    "empty": "No agents, skills, or commands found."
  },
  "picker": {
    "title": "Agents Room",
    "subtitle": "Visual map of your Claude Code agent team",
    "description": "Load a project folder to include workspace-specific agents alongside your global agents from",
    "globalPath": "~/.claude/agents",
    "openFolder": "Open project folder",
    "or": "or",
    "globalOnly": "Global agents only",
    "helperText": "You can always add a workspace later from the toolbar.",
    "tip": "Tip: launch with",
    "tipCommand": "agents-room /path/to/project",
    "tipSuffix": "to skip this step."
  },
  "trash": {
    "title": "Trash",
    "empty": "Trash is empty",
    "columns": {
      "name": "Name",
      "type": "Type",
      "workspace": "Workspace",
      "trashed": "Trashed",
      "actions": "Actions"
    },
    "global": "Global",
    "restoreError": "Could not restore \"{{name}}\" — original directory no longer exists.",
    "permanentlyDelete": "Permanently delete?",
    "deletePermanently": "Delete permanently"
  },
  "sidebar": {
    "verDetails": "Ver detalhes",
    "workspaces": "Workspaces"
  },
  "agent": {
    "changeAvatar": "Change avatar",
    "sections": {
      "tags": "Tags",
      "tools": "Tools",
      "relationships": "Relationships",
      "metadata": "Metadata",
      "prompt": "Prompt",
      "notes": "Notes"
    },
    "addTag": "Add tag and press Enter…",
    "mentionsArrow": "mentions →",
    "referencedBy": "← referenced by",
    "notesHelper": "Stored in ~/.agents-room — not in agent file",
    "notesPlaceholder": "Add personal notes, context, or observations about this agent…",
    "metaKeys": {
      "path": "path",
      "model": "model",
      "source": "source",
      "tools": "tools"
    }
  },
  "skill": {
    "sections": {
      "info": "Info",
      "origin": "Origin",
      "prompt": "Prompt"
    },
    "infoKeys": {
      "folder": "folder",
      "path": "path",
      "workspace": "workspace",
      "origin": "origin",
      "installed": "installed"
    },
    "originLocal": "Local",
    "noPrompt": "No prompt body found in SKILL.md.",
    "danger": {
      "title": "Uninstall skill",
      "description": "Removes ~/.claude/skills/{{name}}/ permanently.",
      "button": "Uninstall",
      "confirm": "Click again to confirm"
    }
  },
  "workspace": {
    "changeAvatar": "Change avatar",
    "changeEmoji": "Change emoji",
    "sections": {
      "displayName": "Display name",
      "tags": "Tags",
      "claudeMd": "CLAUDE.md",
      "settings": "Settings",
      "dangerZone": "Danger zone"
    },
    "addTag": "Add tag and press Enter…",
    "claudeMdPlaceholder": "No CLAUDE.md found. Write instructions for Claude in this workspace…",
    "saveClaudeMd": "Save CLAUDE.md",
    "noSettings": "No settings files found in .claude/",
    "emptyFile": "(empty)",
    "danger": {
      "title": "Danger zone",
      "description": "Removes this workspace from the list. Project files will not be deleted.",
      "warning": "Are you sure? This action cannot be undone.",
      "button": "Remove workspace",
      "confirm": "Are you sure?"
    }
  },
  "browse": {
    "title": "Browse Skills",
    "tabs": {
      "browse": "Browse",
      "url": "Install from URL"
    },
    "noSources": "No curated sources available yet.",
    "noSourcesHelper": "Use \"Install from URL\" to install any skill from GitHub.",
    "loadingSkills": "Loading skills…",
    "noSkills": "No skills found in this source.",
    "model": "Model: {{model}}",
    "urlPlaceholder": "Paste a GitHub URL…",
    "trust": {
      "trusted": "Trusted source",
      "known": "Unverified source",
      "unknown": "Unknown source",
      "unknownWarning": "Only install skills you trust.",
      "unknownCheckbox": "I understand this is an untrusted source",
      "repoInfo": "{{stars}} ★ · {{org}} · updated {{date}}"
    },
    "installSuccess": "✓ Skill installed.",
    "conflict": "A skill named '{{name}}' is already installed.",
    "errors": {
      "NOT_GITHUB": "Only GitHub URLs are supported.",
      "GH_NOT_FOUND": "Skill not found at this URL.",
      "GH_RATE_LIMITED": "GitHub rate limit reached. Try again at {{time}}.",
      "GH_RATE_LIMITED_UNKNOWN": "GitHub rate limit reached. Try again later.",
      "GH_RATE_LIMITED_BROWSE": "GitHub rate limit reached. Try again in a few minutes, or configure a GitHub token.",
      "GH_NO_SKILL_MD": "No SKILL.md found in this folder.",
      "NETWORK_ERROR": "Could not reach GitHub. Check your connection.",
      "LOAD_ERROR": "Could not load skills. Check your connection.",
      "GENERIC": "An error occurred.",
      "INSTALL_FAILED": "Install failed."
    }
  },
  "system": {
    "claudeCode": "Claude Code",
    "agentCount_one": "{{count}} agent registered",
    "agentCount_other": "{{count}} agents registered"
  }
}
```

---

## Execution Plan

```
Round 1 (parallel): TASK-01 · TASK-02
Round 2 (parallel): TASK-03 · TASK-04 · TASK-05
Round 3 (serial):   TASK-06 (depends on all above)
```

- **TASK-01**: Create ui/ primitives (DrawerShell, SectionBlock, InfoTable, DangerZone)
- **TASK-02**: Install i18next + react-i18next, create i18n/index.ts + en-US.json, wire I18nextProvider
- **TASK-03**: Refactor AgentDetailDrawer with primitives + t()
- **TASK-04**: Refactor SkillDetailDrawer with primitives + t()
- **TASK-05**: Refactor WorkspaceDetailDrawer with primitives + t()
- **TASK-06**: Replace all remaining hardcoded strings in non-drawer components (15 files)
