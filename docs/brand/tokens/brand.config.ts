/**
 * Agents Room — Design Tokens
 *
 * Single source of truth for brand values.
 * These tokens are reflected in:
 *   - tailwind.config.js (theme.extend)
 *   - src/renderer/src/assets/main.css (CSS custom properties)
 *   - docs/brand/tokens/tailwind.preset.ts (Tailwind preset reference)
 *
 * Generated from: council/session-010/reports/round-02/final-report.md
 */

export const brand = {
  name: 'Agents Room',
  tagline: 'See your agents. Own your workflow.',
  description: 'A visual workspace for Claude Code agent orchestration. Local. Private. Yours.',

  colors: {
    accent: {
      primary: { light: '#C8922A', dark: '#E0A832' },
      hover:   { light: '#B0801F', dark: '#F0B840' },
      text:    { light: '#8B6914', dark: '#E0A832' },
      surface: { light: 'rgba(200,146,42,0.06)', dark: 'rgba(224,168,50,0.08)' },
      border:  { light: 'rgba(200,146,42,0.20)', dark: 'rgba(224,168,50,0.20)' },
    },
    neutral: {
      0:   '#FFFFFF',
      50:  '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    lepista: {
      violet: '#7F58AF',
    },
    semantic: {
      success: '#22C55E',
      warning: '#EAB308',
      error:   '#EF4444',
      info:    '#3B82F6',
    },
  },

  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
    },
    scale: {
      h1:       { size: '28px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2:       { size: '22px', weight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
      h3:       { size: '18px', weight: 600, lineHeight: 1.3, letterSpacing: '0' },
      body:     { size: '14px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
      bodySmall:{ size: '12px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
      code:     { size: '13px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
      codeSmall:{ size: '11px', weight: 400, lineHeight: 1.4, letterSpacing: '0' },
      label:    { size: '11px', weight: 500, lineHeight: 1.0, letterSpacing: '0.02em' },
    },
  },

  iconography: {
    pack: 'lucide-react',
    defaultStroke: 1.5,
    sizes: { inline: 16, ui: 20, nav: 24, hero: 32 },
  },

  spacing: {
    unit: 4,
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
  },

  borderRadius: {
    sm:   '4px',
    md:   '8px',
    lg:   '12px',
    full: '9999px',
  },
} as const;

export type Brand = typeof brand;
