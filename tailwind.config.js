/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'media',
  theme: {
    // Override all border radii to 0 — straight-edge design system.
    // Only 'full' is kept for truly circular elements (avatars, dot indicators).
    borderRadius: {
      none:    '0px',
      sm:      '0px',
      DEFAULT: '0px',
      md:      '0px',
      lg:      '0px',
      xl:      '0px',
      '2xl':   '0px',
      '3xl':   '0px',
      full:    '9999px',
    },
    extend: {
      colors: {
        ag: {
          bg:          'rgb(var(--ag-bg) / <alpha-value>)',
          surface:     'rgb(var(--ag-surface) / <alpha-value>)',
          'surface-2': 'rgb(var(--ag-surface-2) / <alpha-value>)',
          card:        'rgb(var(--ag-card) / <alpha-value>)',
          'card-skill':'rgb(var(--ag-card-skill) / <alpha-value>)',
          'card-cmd':  'rgb(var(--ag-card-cmd) / <alpha-value>)',
          sidebar:     'rgb(var(--ag-sidebar) / <alpha-value>)',
          border:      'rgb(var(--ag-border) / <alpha-value>)',
          'text-1':    'rgb(var(--ag-text-1) / <alpha-value>)',
          'text-2':    'rgb(var(--ag-text-2) / <alpha-value>)',
          'text-3':    'rgb(var(--ag-text-3) / <alpha-value>)',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-up': 'slideUp 0.22s ease-out',
        'fade-in':  'fadeIn 0.15s ease-out'
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
