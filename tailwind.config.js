/** @type {import('tailwindcss').Config} */

// Colors are CSS variables (RGB triplets, see src/index.css) so light and dark mode
// share one set of class names and opacity modifiers like bg-accent/15 keep working.
const token = name => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        ink: {
          DEFAULT: token('ink'),
          soft: token('ink-soft'),
          faint: token('ink-faint'),
        },
        accent: {
          DEFAULT: token('accent'),
          ink: token('accent-ink'),
          strong: token('accent-strong'),
        },
        partial: token('partial'),
        missed: token('missed'),
        extra: token('extra'),
        strava: '#fc4c02',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -8px rgb(0 0 0 / 0.08)',
        pop: '0 12px 40px -12px rgb(0 0 0 / 0.35)',
      },
    },
  },
  plugins: [],
}
