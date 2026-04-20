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
        'xs': '480px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        primary: '#2563EB',
        background: '#F8FAFC',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        accent: '#22C55E',
        // iOS colors
        ios: {
          blue:    '#007AFF',
          green:   '#34C759',
          red:     '#FF3B30',
          orange:  '#FF9500',
          yellow:  '#FFCC00',
          purple:  '#AF52DE',
          gray:    '#8E8E93',
          gray2:   '#AEAEB2',
          gray3:   '#C7C7CC',
          gray4:   '#D1D1D6',
          gray5:   '#E5E5EA',
          gray6:   '#F2F2F7',
          // dark variants
          'dark-bg':    '#000000',
          'dark-bg2':   '#1C1C1E',
          'dark-bg3':   '#2C2C2E',
          'dark-bg4':   '#3A3A3C',
          'dark-label': '#EBEBF5',
        },
      },
      borderRadius: {
        'ios':    '10px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl':'28px',
      },
    },
  },
  plugins: [],
}
