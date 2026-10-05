import type { MeasureKey, Moment, ViewCode } from "@/lib/formMeasures"

export type Exercise = {
  id: string
  slug: string
  nameEn: string
  nameVi: string | null
  muscleGroups: string[]
  equipment: string[]
  description: string | null
  filmingGuide: string | null // JSON thô — hướng dẫn quay hiện ở màn 8
  analyzable: boolean // máy tự tính: có ít nhất một khớp cần kiểm đang bật
  active: boolean
  formCheckCount: number
  checkViews: ViewCode[] // các góc có khớp đang bật, thứ tự camera hướng dẫn
  updatedAt: string
}

export type ExerciseInput = {
  slug?: string // bắt buộc khi tạo, bỏ qua khi sửa (backend giữ nguyên slug cũ)
  nameEn: string
  nameVi: string
  muscleGroups: string[]
  equipment: string[]
  description: string
  filmingGuide: string
  active: boolean
}

/** Một khớp cần kiểm (doc/design-cham-form-nguong-v1.md §2). from/to là độ, null = không giới hạn. */
export type FormCheck = {
  id: string
  exerciseId: string
  view: ViewCode
  measure: MeasureKey
  moment: Moment
  from: number | null
  to: number | null
  warn: number
  nameVi: string
  cueFailVi: string
  priority: number
}

export type FormCheckInput = Omit<FormCheck, "id" | "exerciseId" | "priority">
