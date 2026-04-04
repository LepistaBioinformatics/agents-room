# Voice & Tone

## Principles

| Principle | Description |
|---|---|
| Brevity | If it can be said in 3 words, don't use 7 |
| Technical by default | Don't explain what a dev already knows |
| Passive for states | "Connection detected" (not "We detected") |
| Active for actions | "Add agent" (not "An agent can be added") |
| No personification | The app doesn't say "I", doesn't apologize |
| No emojis in UI | Emojis only allowed in social marketing |

---

## Voice by Context

| Context | Tone | Example |
|---|---|---|
| UI labels | Minimal, verb-noun | "Add workspace" |
| Empty states | Informative + suggestion | "No agents here yet. Open a Claude Code session to get started." |
| Errors | Factual + action | "Could not read .claude/settings.json. Check file permissions." |
| Success | Quiet | "Saved." or silent visual flash |
| Tooltip | Short explanatory | "Agents in this workspace share a common project root." |
| README | Technical, starts with what it does | No narrative |

---

## Approved Vocabulary

| Approved term | Prohibited terms |
|---|---|
| agent | bot, assistant, AI helper, copilot |
| workspace | project, folder, space, environment |
| canvas | dashboard, board, panel, view |
| skill | plugin, extension, add-on, module |
| trust tier | permission level, security rating |
| connection | relationship, link, dependency, edge |
| annotation | note, comment, sticky, memo |
| local / offline | private, secure, encrypted, air-gapped |
| trash | recycle bin, archive, deleted items |
| keychain | vault, secret store, credential manager |

---

## Anti-patterns

| Prohibited | Reason | Replacement |
|---|---|---|
| "Oops! Something went wrong" | Infantile | "Error: [description]. [suggested action]." |
| "We're sorry" | Corporate | Omit. Go directly to the solution |
| "Powered by AI" | Empty marketing | The product manages agents, doesn't use AI |
| "Smart" / "Intelligent" | Superfluous | Describe what it does, not how |
| "Revolutionary" / "Game-changing" | Hype | Omit |
| Emojis in UI | Visual noise | Plain text |

---

## PR Checklist

Add to PR description when the PR changes UI strings:

```markdown
## UI Text Checklist
- [ ] Uses approved vocabulary (see docs/brand/voice.md)
- [ ] No "we", "our", "sorry"
- [ ] No emojis
- [ ] No superlatives
- [ ] Errors include a suggested action
```
