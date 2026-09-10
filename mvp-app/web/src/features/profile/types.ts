// Giá trị khớp CHECK constraint ở V1__init.sql (bảng profiles).
export const GOALS = [
  { value: "MUSCLE", label: "Tăng cơ" },
  { value: "STRENGTH", label: "Tăng sức mạnh" },
  { value: "FAT_LOSS", label: "Giảm mỡ" },
  { value: "GENERAL", label: "Sức khoẻ chung" },
] as const

export const EXPERIENCE_LEVELS = [
  { value: "NEW", label: "Mới bắt đầu" },
  { value: "LT_1Y", label: "Dưới 1 năm" },
  { value: "1_3Y", label: "1–3 năm" },
  { value: "GT_3Y", label: "Trên 3 năm" },
] as const

export const EQUIPMENT_OPTIONS = [
  { value: "BARBELL_RACK", label: "Tạ đòn + giá đỡ" },
  { value: "DUMBBELL", label: "Tạ đơn" },
  { value: "KETTLEBELL", label: "Tạ ấm" },
  { value: "BENCH", label: "Ghế" },
] as const

// A3: giới tính là tuỳ chọn.
export const GENDERS = [
  { value: "F", label: "Nữ" },
  { value: "M", label: "Nam" },
  { value: "OTHER", label: "Khác" },
] as const

export type BodyMetric = {
  heightCm: number | null
  weightKg: number | null
  measuredOn: string
}

export type Profile = {
  goal: string | null
  experience: string | null
  sessionsPerWeek: number | null
  equipment: string[]
  birthYear: number | null
  gender: string | null
  disclaimerAt: string | null
  onboardingStep: string
  latestBodyMetric: BodyMetric | null
}

export type ProfilePatch = Partial<{
  goal: string
  experience: string
  sessionsPerWeek: number
  equipment: string[]
  birthYear: number
  gender: string
  acceptDisclaimer: boolean
  onboardingStep: string
}>

export function labelOf(options: readonly { value: string; label: string }[], value: string | null) {
  return options.find((o) => o.value === value)?.label ?? "—"
}
