import type { Config } from "tailwindcss"
import { colours } from "./src/styles/tokens.ts"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: colours.ground,
        surface: colours.surface,
        "surface-muted": colours.surfaceMuted,
        line: colours.line,
        ink: colours.ink,
        "ink-2": colours.ink2,
        "ink-3": colours.ink3,
        brand: colours.brand,
        "brand-hover": colours.brandHover,
        turquoise: colours.turquoise,
        "brand-tint": colours.brandTint,
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", '"SF Pro Display"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,40,50,0.04), 0 8px 24px rgba(15,40,50,0.05)",
        lift: "0 2px 4px rgba(15,40,50,0.05), 0 12px 28px rgba(15,40,50,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config
