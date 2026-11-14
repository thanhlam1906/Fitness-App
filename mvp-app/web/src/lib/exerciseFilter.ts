import { MUSCLE_OPTIONS } from "@/lib/muscles"

type Searchable = { nameEn: string; nameVi: string | null; muscleGroups: string[] }

/** Chữ thường, bỏ dấu, đổi đ thành d: người dùng gõ "day nguc" vẫn ra "Đẩy ngực". */
export function normalizeVi(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase()
}

/**
 * Khớp tên Anh lẫn Việt. Nhóm cơ khớp bất kỳ nhóm nào của bài, không chỉ cơ chính: squat ra ở cả Đùi trước lẫn Mông.
 * Thư viện 1.328 bài: mỗi từ gõ phải có trong tên, thứ tự nào cũng được ("squat barbell" ra "Barbell Back Squat"),
 * rồi xếp bài khớp nhất lên đầu (0 tên bắt đầu bằng chữ gõ, 1 mọi từ gõ là đầu một từ trong tên, 2 còn lại).
 * Cùng mức giữ thứ tự đưa vào: nơi gọi đã sắp ABC. Ô tìm trống thì giữ nguyên danh sách.
 */
export function filterExercises<T extends Searchable>(list: T[], query: string, muscle: string | null): T[] {
  const needle = normalizeVi(query.trim()).replace(/\s+/g, " ")
  const tokens = needle ? needle.split(" ") : []
  const ranked: { e: T; rank: number }[] = []
  for (const e of list) {
    if (muscle && !e.muscleGroups.includes(muscle)) continue
    if (tokens.length === 0) {
      ranked.push({ e, rank: 0 })
      continue
    }
    const haystack = normalizeVi(`${e.nameEn} ${e.nameVi ?? ""}`)
    if (!tokens.every((t) => haystack.includes(t))) continue
    const words = haystack.split(/[^a-z0-9]+/)
    // "push-up" gõ vào là hai đầu từ "push", "up": tách cùng cách với tên.
    const parts = tokens.flatMap((t) => t.split(/[^a-z0-9]+/).filter(Boolean))
    const rank = normalizeVi(e.nameEn).startsWith(needle)
      ? 0
      : parts.length > 0 && parts.every((t) => words.some((w) => w.startsWith(t)))
        ? 1
        : 2
    ranked.push({ e, rank })
  }
  // sort của JS ổn định: cùng mức thì giữ thứ tự ABC nơi gọi đưa vào.
  return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.e)
}

/** Khung chọn bài vẽ tối đa chừng này dòng: 1.328 dòng kèm ảnh nhỏ là hơn nghìn ảnh tải cùng lúc. */
export const PICKER_LIMIT = 50

/** Câu dưới danh sách khi còn bài không vẽ ra; null khi đã hiện hết. */
export function moreMatches(total: number): string | null {
  if (total <= PICKER_LIMIT) return null
  return `Hiện ${PICKER_LIMIT} trong ${total.toLocaleString("vi-VN")} bài. Gõ tên hoặc chọn nhóm cơ để thu hẹp.`
}

/** Chip nhóm cơ: chỉ nhóm đang có bài, theo thứ tự MUSCLE_OPTIONS. */
export function muscleChips(list: { muscleGroups: string[] }[]) {
  return MUSCLE_OPTIONS.filter((m) => list.some((e) => e.muscleGroups.includes(m.value)))
}
