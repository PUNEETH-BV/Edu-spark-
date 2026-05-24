/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        // Map CSS variable names used throughout the app as Tailwind utilities
        purple:        'var(--purple)',
        'purple-light':'var(--purple-light)',
        blue:          'var(--blue)',
        cyan:          'var(--cyan)',
        green:         'var(--green)',
        yellow:        'var(--yellow)',
        pink:          'var(--pink)',
        'text-primary':'var(--text-primary)',
        'text-muted':  'var(--text-muted)',
        surface1:      'var(--bg-surface1)',
        surface2:      'var(--bg-surface2)',
        surface3:      'var(--bg-surface3)',
      },
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans:    ['Inter',  'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '60px',
      },
    },
  },
  plugins: [],
};
