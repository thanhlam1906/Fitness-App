import type { ExerciseInput } from "@/features/exercise/types"
import { parseFilmingGuide, type FilmingGuide } from "@/features/review/types"
import { VIEW_NAME, VIEW_ORDER, type ViewCode } from "@/lib/formMeasures"

/** Ô "Hướng dẫn quay" của form admin (doc/design-anh-bai-tap-v1.md §2). */
export type GuideForm = {
  distance: string
  lighting: string
  duration: string
  notes: Record<ViewCode, string>
}

/** Giá trị của form "Thông tin bài": ô chữ nhóm cơ/thiết bị và ô hướng dẫn quay được ghép lại lúc lưu. */
export type ExerciseFormValues = ExerciseInput & { muscleGroupsText: string; equipmentText: string; guide: GuideForm }

const TIPS = ["distance", "lighting", "duration"] as const

/** JSON đã lưu → ô form. JSON hỏng (admin nhập tay thời còn ô JSON) thì form trống thay vì vỡ màn. */
export function guideToForm(raw: string | null): GuideForm {
  const guide = parseFilmingGuide(raw)
  const noteOf = (view: ViewCode) => guide?.angles?.find((a) => a.code === view)?.why ?? ""
  return {
    distance: guide?.distance ?? "",
    lighting: guide?.lighting ?? "",
    duration: guide?.duration ?? "",
    notes: { SAGITTAL: noteOf("SAGITTAL"), FRONTAL: noteOf("FRONTAL"), DIAGONAL: noteOf("DIAGONAL") },
  }
}

/**
 * Ô form → JSON đúng dạng cũ mà màn gửi clip (web, mobile) đang đọc. Bỏ ô trống để người tập thấy câu
 * dặn mặc định; form trống hết thì "" (backend lưu NULL).
 */
export function formToGuide(form: GuideForm): string {
  const guide: FilmingGuide = {}
  const angles = VIEW_ORDER.filter((v) => form.notes[v].trim() !== "").map((v) => ({
    code: v,
    label: VIEW_NAME[v],
    why: form.notes[v].trim(),
  }))
  if (angles.length > 0) guide.angles = angles
  for (const key of TIPS) {
    const value = form[key].trim()
    if (value !== "") guide[key] = value
  }
  return Object.keys(guide).length > 0 ? JSON.stringify(guide) : ""
}
