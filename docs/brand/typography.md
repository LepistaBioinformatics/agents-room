# Typography

## Decision: Inter + JetBrains Mono

| Role | Font | Weights | Package |
|---|---|---|---|
| Display / Headlines | Inter | 600 (SemiBold), 700 (Bold) | `@fontsource/inter` |
| Body | Inter | 400 (Regular), 500 (Medium) | `@fontsource/inter` |
| Code / Mono | JetBrains Mono | 400 (Regular), 500 (Medium) | `@fontsource/jetbrains-mono` |

**Approved alternative:** Geist Sans + Geist Mono (via `geist` npm package). Valid if the founder prefers.

---

## Type Scale

| Level | Font | Size | Weight | Line-height | Letter-spacing | Tailwind class |
|---|---|---|---|---|---|---|
| H1 | Inter | 28px | 700 | 1.2 | -0.02em | `text-h1` |
| H2 | Inter | 22px | 600 | 1.3 | -0.01em | `text-h2` |
| H3 | Inter | 18px | 600 | 1.3 | 0 | `text-h3` |
| Body | Inter | 14px | 400 | 1.5 | 0 | `text-body` |
| Body Small | Inter | 12px | 400 | 1.4 | 0 | `text-body-sm` |
| Code | JetBrains Mono | 13px | 400 | 1.5 | 0 | `text-code font-mono` |
| Code Small | JetBrains Mono | 11px | 400 | 1.4 | 0 | `text-code-sm font-mono` |
| Label / Badge | Inter | 11px | 500 | 1.0 | 0.02em | `text-label` |

---

## Fallback Stack

```
sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
mono: JetBrains Mono, Fira Code, Consolas, monospace
```

---

## Bundling (Electron — Offline)

Use static fonts (not variable) via `@fontsource`. Total weight: ~500–600KB. Do not depend on Google Fonts CDN.

**Imported in `src/renderer/src/assets/main.css`:**

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
```

**Base font size:** 15px (set on `html` in main.css).

---

## Rules

- Code, `pre`, `kbd`, `samp` elements automatically use JetBrains Mono via `main.css` base reset.
- Use `font-mono` Tailwind class for inline code snippets.
- Never use `font-weight: 300` (Light) — not bundled.
- Never use `font-weight: 800+` (ExtraBold/Black) — not part of the brand scale.
