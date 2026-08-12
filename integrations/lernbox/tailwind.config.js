/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          hover: "rgb(var(--surface-hover) / <alpha-value>)",
        },
        text: {
          main: "rgb(var(--text-main) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
        },
        primary: "rgb(var(--primary) / <alpha-value>)",
        border: {
          default: "rgb(var(--border-default) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
}
