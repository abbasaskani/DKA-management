/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#f4fff8',
          100: '#e6fff0',
          200: '#b9f5d2',
          300: '#87e6b0',
          400: '#4dc98a',
          500: '#27ad6f',
          600: '#1f7a52',
          700: '#185c3f',
          800: '#12422f',
          900: '#0c2b1f'
        }
      }
    }
  },
  plugins: []
};
