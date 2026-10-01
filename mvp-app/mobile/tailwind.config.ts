import type { Config } from "tailwindcss"
import { colors, fontSize, radius } from "./src/theme"

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: { colors, fontSize, borderRadius: radius } },
} satisfies Config
