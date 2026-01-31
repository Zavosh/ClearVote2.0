/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'discrepancy-red': '#ef4444',
        'discrepancy-red-light': '#fee2e2',
        'consistent-green': '#22c55e',
        'consistent-green-light': '#dcfce7',
        'nuanced-yellow': '#eab308',
        'nuanced-yellow-light': '#fef9c3',
      }
    },
  },
  plugins: [],
}
