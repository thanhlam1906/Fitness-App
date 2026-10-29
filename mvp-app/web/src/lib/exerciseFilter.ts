import { MUSCLE_OPTIONS } from "@/lib/muscles"

type Searchable = { nameEn: string; nameVi: string | null; muscleGroups: string[] }

/** Chữ thường, bỏ dấu, đổi đ thành d: người dùng gõ "day nguc" vẫn ra "Đẩy ngực". */
export function normalizeVi(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase()
}

/** Khớp tên Anh lẫn Việt. Nhóm cơ khớp bất kỳ nhóm nào của bài, không chỉ cơ chính: squat ra ở cả Đùi trước lẫn Mông. */
export function filterExercises<T extends Searchable>(list: T[], query: string, muscle: string | null): T[] {
  const needle = normalizeVi(query.trim())
  return list.filter(
    (e) =>
      (!muscle || e.muscleGroups.includes(muscle)) &&
      (!needle || normalizeVi(`${e.nameEn} ${e.nameVi ?? ""}`).includes(needle)),
  )
}

/** Chip nhóm cơ: chỉ nhóm đang có bài, theo thứ tự MUSCLE_OPTIONS. */
export function muscleChips(list: { muscleGroups: string[] }[]) {
  return MUSCLE_OPTIONS.filter((m) => list.some((e) => e.muscleGroups.includes(m.value)))
}
