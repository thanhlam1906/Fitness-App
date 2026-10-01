// Chép từ web/src/styles/index.css @theme — cùng tên để class web chép sang được (bg-surface…).
// Sửa token thì sửa cả hai nơi.
export const colors = {
  bg: "#0a0c0e",
  surface: "#14181b",
  "surface-2": "#1d2226",
  border: "#2a3136",
  text: "#e8edef",
  "text-muted": "#8d9aa1",
  accent: "#b8ff3c",
  "accent-fg": "#0a0c0e",
  success: "#2fbf71",
  warn: "#f5b544",
  danger: "#f2635f",
  "accent-tint": "rgba(184, 255, 60, 0.16)",
  "success-tint": "rgba(47, 191, 113, 0.16)",
  "warn-tint": "rgba(245, 181, 68, 0.16)",
  "danger-tint": "rgba(242, 99, 95, 0.16)",
  glass: "rgba(20, 24, 27, 0.62)",
  "glass-border": "rgba(255, 255, 255, 0.08)",
} as const

export const fontSize = { xs: "12px", sm: "14px", base: "16px", lg: "20px", "2xl": "32px", load: "64px" }
export const radius = { sm: "6px", md: "10px", lg: "14px" }
