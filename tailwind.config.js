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
          DEFAULT: "#EF4444",   // main red
          dark:    "#DC2626",   // hover
          darker:  "#B91C1C",   // gradient end
          light:   "#FEE2E2",   // tint backgrounds
          soft:    "#FFF1F1",   // very light pink sections
        },
        ink: {
          DEFAULT: "#0A0A0A",   // near-black text
          muted:   "#6B7280",   // secondary text
          subtle:  "#9CA3AF",   // tertiary / captions
        },
        surface: {
          white:   "#FFFFFF",
          pink:    "#FFF1F1",   // Features section bg
          dark:    "#111111",   // Stats / Comparison bg
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
