/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px', // Extra small breakpoint for mobile
      },
      colors: {
        primary: '#2563EB',
        background: '#FAFAFA',
        textPrimary: '#171717',
        textSecondary: '#525252',
        accent: '#22C55E',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'status-pulse': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(1.2, 1.9)' },
        },
        'status-pop': {
          '0%, 30%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.3)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'status-pulse': 'status-pulse 1.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        'status-pop': 'status-pop 1.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      }
    },
  },
  plugins: [],
}
