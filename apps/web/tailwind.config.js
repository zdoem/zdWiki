/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "sans-serif"],
        heading: ["var(--font-heading)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      colors: {
        canvas: "#0f1319",
        surface: "#151b26",
        surfaceElevated: "#1e2634",
        surfaceHighlight: "#263244",
        surfaceCard: "#19222e",
        borderSubtle: "#232f3e",
        hairline: "rgba(255, 255, 255, 0.08)",
        textMain: "#f1f5f9",
        textMuted: "#94a3b8",
        textDim: "#64748b",
        brass: {
          DEFAULT: "#f0b429",
          light: "#fbbf24",
          dark: "#d97706",
          dim: "rgba(240, 180, 41, 0.15)",
        },
        cyan: {
          DEFAULT: "#38bdf8",
          dim: "rgba(56, 189, 248, 0.15)",
        },
        emerald: {
          DEFAULT: "#10b981",
          dim: "rgba(16, 185, 129, 0.15)",
        },
        rose: {
          DEFAULT: "#f43f5e",
          dim: "rgba(244, 63, 94, 0.15)",
        },
        purple: {
          DEFAULT: "#a855f7",
          dim: "rgba(168, 85, 247, 0.15)",
        },
      },
    },
  },
  plugins: [],
};
