/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gwent: {
          gold: '#c9a227',
          bronze: '#8b6914',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          card: '#2d2d44',
          border: '#4a4a6a',
        },
      },
      fontFamily: {
        medieval: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
