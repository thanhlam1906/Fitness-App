export type Exercise = {
  id: string
  slug: string
  nameEn: string
  nameVi: string | null
  muscleGroups: string[]
  equipment: string[]
  description: string | null
  filmingGuide: string | null // JSON thô — hướng dẫn quay hiện ở màn 8
  analyzable: boolean
  active: boolean
  formCheckCount: number
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
  analyzable: boolean
  active: boolean
}

export type FormCheck = {
  id: string
  exerciseId: string
  code: string
  metric: string
  validViewpoints: string[]
  thresholds: string // JSON thô — xem F4 concept-frontend-v1.md
  confidenceMin: number
  cuePassVi: string | null
  cueWarnVi: string | null
  cueFailVi: string
  priority: number
  active: boolean
}

export type FormCheckInput = {
  code?: string // bắt buộc khi tạo, bỏ qua khi sửa
  metric: string
  validViewpoints: string[]
  thresholds: string
  confidenceMin: number
  cuePassVi: string
  cueWarnVi: string
  cueFailVi: string
  priority: number
  active: boolean
}
