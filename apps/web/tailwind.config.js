/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0f172a',
          600: '#1e293b',
          700: '#334155',
          800: '#475569',
          900: '#0f172a'
        }
      }
    }
  },
  plugins: []
}
