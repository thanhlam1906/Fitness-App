export type SetLogResponse = {
  id: string
  exerciseId: string
  setIndex: number
  targetReps: number | null
  reps: number | null
  loadKg: number | null
  rpe: number | null
  skipped: boolean
  skipReason: string | null
}

export type SessionResponse = {
  id: string
  userId: string
  scheduledWorkoutId: string | null
  status: "IN_PROGRESS" | "DONE" | "ABANDONED"
  startedAt: string
  finishedAt: string | null
  /** RPE cả buổi — null = người dùng bỏ qua câu hỏi, hợp lệ. */
  sessionRpe: number | null
  sets: SetLogResponse[]
}

export type FinishSessionInput = {
  painReports: PainReportInput[]
  sessionRpe: number | null
}

export type SetLogInput = {
  exerciseId: string
  setIndex: number
  targetReps: number | null
  reps: number | null
  loadKg: number | null
  rpe: number | null
  skipped: boolean
  skipReason: string | null
}

export type PainReportInput = {
  bodyArea: string
  severity: number
  note: string
}

export const SKIP_REASONS = [
  { value: "TIRED", label: "Mệt" },
  { value: "NO_EQUIPMENT", label: "Thiếu thiết bị" },
  { value: "PAIN", label: "Đau" },
  { value: "OTHER", label: "Khác" },
] as const

/**
 * F3 §8 concept-frontend-v1.md còn treo — danh sách vùng cơ thể do HLV chốt.
 * Đây là bộ tạm, đủ để luồng chạy; giá trị lưu thẳng vào pain_reports.body_area
 * (cột text tự do, không có CHECK) nên đổi danh sách không cần migration.
 */
export const BODY_AREAS = [
  { value: "LOWER_BACK", label: "Lưng dưới" },
  { value: "UPPER_BACK", label: "Lưng trên" },
  { value: "SHOULDER_L", label: "Vai trái" },
  { value: "SHOULDER_R", label: "Vai phải" },
  { value: "KNEE_L", label: "Gối trái" },
  { value: "KNEE_R", label: "Gối phải" },
  { value: "HIP", label: "Hông" },
  { value: "ELBOW", label: "Khuỷu tay" },
  { value: "WRIST", label: "Cổ tay" },
  { value: "OTHER", label: "Chỗ khác" },
] as const
