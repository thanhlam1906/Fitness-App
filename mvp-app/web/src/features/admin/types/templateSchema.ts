import { z } from "zod"

// Khoảng số trùng ProgramTemplateRequest ở backend; backend vẫn là chốt chặn, ở đây để báo sớm.
const int = (min: number, max: number, label: string) =>
  z
    .number({ error: `Nhập ${label.toLowerCase()}` })
    .int(`${label} là số nguyên`)
    .min(min, `${label} từ ${min} đến ${max}`)
    .max(max, `${label} từ ${min} đến ${max}`)

const num = (min: number, max: number, label: string) =>
  z
    .number({ error: `Nhập ${label.toLowerCase()}` })
    .min(min, `${label} từ ${min} đến ${max}`)
    .max(max, `${label} từ ${min} đến ${max}`)

const exerciseSchema = z
  .object({
    slug: z.string().min(1, "Chọn bài"),
    sets: int(1, 10, "Số set"),
    repsMin: int(1, 300, "Rep"),
    repsMax: int(1, 300, "Rep"),
    restSec: int(0, 600, "Nghỉ"),
  })
  .refine((e) => e.repsMin <= e.repsMax, {
    message: "Rep “từ” không được lớn hơn rep “đến”",
    path: ["repsMax"],
  })

export const progressionSchema = z.object({
  targetRpe: num(1, 10, "RPE mục tiêu"),
  rpeLowStreak: int(1, 10, "Số buổi"),
  rpeOver: num(0, 5, "Độ vượt RPE"),
  minCompletionPct: num(0, 100, "Tỉ lệ hoàn thành"),
  missedSetsToDeload: int(1, 10, "Số set"),
  failStreakToDeload: int(1, 10, "Số buổi"),
  deloadPct: num(1, 50, "Phần trăm giảm"),
  incrementKg: z.record(
    z.string(),
    z
      .number({ error: "Nhập số kg" })
      .gt(0, "Bước tăng phải lớn hơn 0")
      .max(20, "Bước tăng tối đa 20 kg")
      .nullable(),
  ),
})

export const templateSchema = z
  .object({
    name: z.string().trim().min(1, "Cần tên template").max(120, "Tối đa 120 ký tự"),
    methodology: z.string(),
    sessionsMin: int(1, 7, "Số buổi"),
    sessionsMax: int(1, 7, "Số buổi"),
    requiredEquipment: z.array(z.string()),
    active: z.boolean(),
    days: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Cần tên buổi").max(40, "Tối đa 40 ký tự"),
          exercises: z.array(exerciseSchema).min(1, "Buổi chưa có bài nào"),
        }),
      )
      .min(1, "Cần ít nhất một buổi"),
    progression: progressionSchema,
  })
  .refine((t) => t.sessionsMin <= t.sessionsMax, {
    message: "Số đầu không được lớn hơn số sau",
    path: ["sessionsMax"],
  })
