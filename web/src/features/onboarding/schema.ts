import { z } from "zod"

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

export const onboardingSchema = z.object({
  goal: z.enum(GOALS.map((g) => g.value) as [string, ...string[]]),
  experience: z.enum(EXPERIENCE_LEVELS.map((e) => e.value) as [string, ...string[]]),
  sessionsPerWeek: z.number().int().min(2).max(6),
  equipment: z.array(z.string()).min(1, "Chọn ít nhất một thiết bị"),
})

export type OnboardingFormValues = z.infer<typeof onboardingSchema>
