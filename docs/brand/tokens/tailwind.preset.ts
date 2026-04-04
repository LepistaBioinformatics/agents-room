/**
 * Agents Room — Tailwind Preset
 *
 * Reference preset capturing all brand tokens for Tailwind CSS.
 * The live implementation uses tailwind.config.js in the project root.
 * This file documents the complete brand surface for external consumers
 * or future extraction into a shared package.
 *
 * Generated from: council/session-010/reports/round-02/final-report.md
 */

import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT:        '#C8922A',      // light primary — use CSS var in app
          dark:           '#E0A832',      // dark primary
          hover:          '#B0801F',
          'hover-dark':   '#F0B840',
          text:           '#8B6914',
          'text-dark':    '#E0A832',
          surface:        'rgba(200,146,42,0.06)',
          'surface-dark': 'rgba(224,168,50,0.08)',
          border:         'rgba(200,146,42,0.20)',
          'border-dark':  'rgba(224,168,50,0.20)',
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
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        h1:        ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2:        ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3:        ['18px', { lineHeight: '1.3', letterSpacing: '0',       fontWeight: '600' }],
        body:      ['14px', { lineHeight: '1.5', letterSpacing: '0',       fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0',       fontWeight: '400' }],
        code:      ['13px', { lineHeight: '1.5', letterSpacing: '0',       fontWeight: '400' }],
        'code-sm': ['11px', { lineHeight: '1.4', letterSpacing: '0',       fontWeight: '400' }],
        label:     ['11px', { lineHeight: '1.0', letterSpacing: '0.02em',  fontWeight: '500' }],
      },
      borderRadius: {
        // Note: tailwind.config.js overrides all radii to 0 (straight-edge system).
        // These are the brand-intended values — apply selectively via inline style or
        // custom classes when rounded corners are explicitly required.
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        full: '9999px',
      },
    },
  },
};

export default preset;
