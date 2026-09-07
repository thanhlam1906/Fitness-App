import { z } from "zod"

// 1=Thứ 2 … 7=Chủ nhật — khớp DayOfWeek.getValue() bên backend (V1__init.sql).
export const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" },
] as const

export const createProgramSchema = z.object({
  templateId: z.string().min(1, "Chọn một chương trình"),
  startingLoads: z.array(
    z.object({
      slug: z.string().min(1, "Nhập tên bài (slug)"),
      kg: z.number().min(0),
    }),
  ),
  restDays: z.array(z.number()),
  startDate: z.string().min(1),
})

export type CreateProgramFormValues = z.infer<typeof createProgramSchema>
