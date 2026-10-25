/** @type {import('tailwindcss').Config} */

// Colors are CSS variables (RGB triplets, see src/index.css), so opacity modifiers
// like bg-accent/15 work and the palette is defined in one place.
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
        // Humanist sans for reading, a classical serif for numbers, Roman capitals for titles
        sans: ['"Alegreya Sans"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        title: ['Cinzel', 'Georgia', 'serif'],
      },
      // Corners stay small throughout; the classical look avoids soft, pill-shaped UI
      borderRadius: {
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '3px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '6px',
      },
      boxShadow: {
        pop: '0 16px 40px -12px rgb(0 0 0 / 0.6)',
      },
    },
  },
  plugins: [],
}
