/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'whisper-bg': '#080b12', 
        'whisper-secondary': '#1e293b',
      }
    },
  },
  plugins: [],
}