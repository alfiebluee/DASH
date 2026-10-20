import type { Colour, Status } from "../data/schemas.ts"

export const colours = {
  ground: "#F3F8F9",
  surface: "rgba(255,255,255,0.80)",
  surfaceMuted: "#EBF2F4",
  line: "rgba(15,40,50,0.07)",
  ink: "#0F1C24",
  ink2: "#3E4F59",
  ink3: "#5B6B75",
  brand: "#0E7490",
  brandHover: "#0B5F76",
  turquoise: "#22C3C9",
  brandTint: "#E0F6F7",
} as const

export const palette = {
  Lagoon: { accent: "#14B8C4", tint: "#E0F6F7" },
  Ocean: { accent: "#2F80ED", tint: "#E5EFFD" },
  Sky: { accent: "#56B6F7", tint: "#E6F4FE" },
  Indigo: { accent: "#5B5BD6", tint: "#ECECFB" },
  Mint: { accent: "#2BC48A", tint: "#E2F7EE" },
  Coral: { accent: "#FF7A6B", tint: "#FFECE9" },
  Amber: { accent: "#F5B341", tint: "#FEF4E1" },
  Orchid: { accent: "#C86BDA", tint: "#F7EAFA" },
} as const

export const statusStyles: Record<Status, { color: string; background: string }> = {
  "On track": { color: "#17694A", background: "#E2F7EE" },
  "At risk": { color: "#8A5A00", background: "#FEF4E1" },
  Blocked: { color: "#B3261E", background: "#FFECE9" },
  Paused: { color: "#3E4F59", background: "#EBF2F4" },
}

export const capacityColours = {
  turquoise: colours.turquoise,
  amber: palette.Amber.accent,
  coral: palette.Coral.accent,
} as const

export function swatch(colour: Colour): { accent: string; tint: string } {
  return palette[colour]
}
