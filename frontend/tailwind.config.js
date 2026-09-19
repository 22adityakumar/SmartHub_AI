/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        darkSurface: "#111827",
        darkCard: "#1F2937",
        darkBorder: "#374151",
        accentBlue: "#3B82F6",
        accentCyan: "#06B6D4",
        accentEmerald: "#10B981"
      }
    },
  },
  plugins: [],
}
