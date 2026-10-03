export type ReviewStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "REJECTED"

export type CheckResult = {
  id: string
  code: string | null // kết quả rule cũ (trước V11)
  name: string | null // mục do LLM chấm
  verdict: string
  confidence: number | null
  measured: string | null // jsonb thô, hiển thị khi cần soi số
  cueTextVi: string | null
  isPrimary: boolean
}

/** Một dẫn chứng của mục do LLM chấm: đúng một ô của bộ số, nhãn và đơn vị do analyzer ghi. */
export type Evidence = {
  clip: number
  view: string
  view_vi: string
  rep: number
  feature: string
  label_vi: string
  value: number
  unit?: string
}

export type Review = {
  id: string
  exerciseId: string | null // null khi màn camera gửi lên mà analyzer chưa nhận diện xong
  exerciseName: string | null
  status: ReviewStatus
  rejectReason: string | null
  error: string | null
  createdAt: string
  finishedAt: string | null
  viewpoints: (string | null)[]
  checks: CheckResult[]
}

export type FilmingAngle = { code: string; label: string; why: string }

export type FilmingGuide = {
  angles?: FilmingAngle[]
  distance?: string
  lighting?: string
  duration?: string
  figure?: string | null
}

export type Exercise = {
  id: string
  slug: string
  nameEn: string
  nameVi: string | null
  muscleGroups: string[]
  equipment: string[]
  description: string | null
  filmingGuide: string | null // jsonb thô từ backend
  analyzable: boolean
  active: boolean
  /** Số mục kiểm đang bật — màn 7 hiện "3 mục kiểm". */
  formCheckCount: number
  updatedAt: string
}

export const VIEWPOINT_OPTIONS = [
  { value: "SAGITTAL", label: "Ngang (bên hông)" },
  { value: "FRONTAL", label: "Chính diện" },
  { value: "DIAGONAL", label: "Chéo ~45°" },
] as const

export function parseFilmingGuide(raw: string | null): FilmingGuide | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as FilmingGuide
  } catch {
    return null // admin nhập JSON hỏng — thà không hiện hướng dẫn còn hơn vỡ màn
  }
}
