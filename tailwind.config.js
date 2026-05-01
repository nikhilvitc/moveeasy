// ─────────────────────────────────────────────────────────────────────────────
// tailwind.config.js
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {

      // ── Brand colors ────────────────────────────────────────────────────
      colors: {
        primary: {
          DEFAULT: "#E85A4F",   // MovEazy coral (Figma-adjacent)
          dark:    "#D64A3F",
          darker:  "#B91C1C",
          light:   "#FECACA",
          soft:    "#FFF4F2",
          glow:    "#FF8A7A",
        },
        ink: {
          DEFAULT: "#292524",   // warm stone — not harsh black
          muted:   "#57534E",
          subtle:  "#78716C",
        },
        surface: {
          white:   "#FFFFFF",
          pink:    "#FFF4F2",
          mist:    "#F0F9FF",   // cool accent for depth
          dark:    "#1C1917",
        },
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      // ── Box shadows ──────────────────────────────────────────────────────
      boxShadow: {
        card:       "0 4px 24px rgba(0,0,0,0.08)",
        "card-lg":  "0 8px 40px rgba(0,0,0,0.13)",
        red:        "0 6px 24px rgba(239,68,68,0.32)",
        "red-lg":   "0 10px 40px rgba(239,68,68,0.40)",
        navbar:     "0 2px 24px rgba(0,0,0,0.09)",
      },

      // ── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },

  plugins: [],
};
