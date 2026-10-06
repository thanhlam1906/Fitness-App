import type { Progression, ProgramTemplate, ProgramTemplateInput, TemplateDay, TemplateExercise } from "@/features/admin/types"

/** Trùng ProgressionConfig.DEFAULT ở backend — đúng số engine dùng trước khi admin chỉnh được. */
export const DEFAULT_PROGRESSION: Progression = {
  targetRpe: 8,
  rpeLowStreak: 2,
  rpeOver: 1,
  minCompletionPct: 70,
  missedSetsToDeload: 2,
  failStreakToDeload: 2,
  deloadPct: 10,
  incrementKg: {},
}

export function newExercise(): TemplateExercise {
  return { slug: "", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }
}

/** Template mới tắt sẵn: người tập chỉ thấy khi admin làm xong và bật. */
export function emptyTemplate(): ProgramTemplateInput {
  return {
    name: "",
    methodology: "",
    sessionsMin: 3,
    sessionsMax: 3,
    requiredEquipment: [],
    active: false,
    days: [{ label: "A", exercises: [newExercise()] }],
    progression: { ...DEFAULT_PROGRESSION, incrementKg: {} },
  }
}

export function toInput(t: ProgramTemplate): ProgramTemplateInput {
  return {
    name: t.name,
    methodology: t.methodology ?? "",
    sessionsMin: t.sessionsMin,
    sessionsMax: t.sessionsMax,
    requiredEquipment: t.requiredEquipment,
    active: t.active,
    days: t.days,
    progression: t.progression,
  }
}

/** Bài có dụng cụ trong template, mỗi slug một lần: bước tăng tạ là theo bài, không theo dòng. */
export function loadedSlugs(days: TemplateDay[], needsLoad: (slug: string) => boolean): string[] {
  const seen = new Set<string>()
  for (const day of days) {
    for (const e of day.exercises) {
      if (e.slug && needsLoad(e.slug)) seen.add(e.slug)
    }
  }
  return [...seen]
}

/** Bài có dụng cụ mà admin chưa chọn "Tăng" hay "Không tự tăng" — backend sẽ 400, chặn trước. */
export function missingIncrements(slugs: string[], incrementKg: Record<string, number | null>): string[] {
  return slugs.filter((s) => !(s in incrementKg))
}

/** Số thẻ quy tắc (1–4) theo ruleId engine trả về, để viền thẻ đã quyết định. */
export function ruleNumber(ruleId: string): 1 | 2 | 3 | 4 {
  if (ruleId.startsWith("PAIN")) return 1
  if (ruleId === "LOW_COMPLETION_RATE") return 2
  if (ruleId.startsWith("RPE")) return 3
  return 4
}

/** Chữ admin gõ ở ô kg → số; rỗng hoặc không đọc được là NaN để schema báo lỗi. Chấp nhận dấu phẩy "2,5". */
export function parseKg(text: string): number {
  return text.trim() === "" ? Number.NaN : Number(text.replace(",", "."))
}

/**
 * Bỏ khoá bước tăng của bài không còn cần tạ trong template (xoá dòng, đổi bài).
 * Schema kiểm mọi khoá, nên khoá cũ mà sai sẽ chặn lưu mà admin không thấy hàng nào để sửa.
 * Trả đúng object cũ khi không có gì phải bỏ, để gọi ra biết không cần setValue.
 */
export function pruneIncrements(
  incrementKg: Record<string, number | null>,
  slugs: string[],
): Record<string, number | null> {
  const keep = new Set(slugs)
  const keys = Object.keys(incrementKg)
  if (keys.every((k) => keep.has(k))) return incrementKg
  return Object.fromEntries(keys.filter((k) => keep.has(k)).map((k) => [k, incrementKg[k]]))
}
