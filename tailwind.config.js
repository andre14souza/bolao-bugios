/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        football: {
          darkGreen: '#052214',
          pitchGreen: '#083d22',
          grassGreen: '#198754',
          vibrantGreen: '#10b981',
          gold: '#f59e0b',
          brightYellow: '#fbbf24',
          royalBlue: '#2563eb',
          deepBlue: '#1d4ed8',
          lightBlue: '#eff6ff',
          glassBg: 'rgba(5, 34, 20, 0.7)',
          glassBorder: 'rgba(16, 185, 129, 0.2)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
