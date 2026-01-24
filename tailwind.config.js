/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paper': '#fdf6e3', 
        'ink': '#2b2b2b',   
        'accent': '#d97706',
      },
    },
  },
  plugins: [],
}