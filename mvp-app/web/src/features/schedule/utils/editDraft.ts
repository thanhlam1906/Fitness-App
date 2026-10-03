import type { ScheduledExerciseView } from "@/features/schedule/types"

/**
 * Bản nháp của khung "Sửa buổi này" (doc/design-ui-m3-v1.md §3): mọi thay đổi giữ ở
 * đây tới khi bấm "Lưu", để "Huỷ" bỏ được cả xoá lẫn thêm bài.
 */
export type DraftRow = {
  key: string
  /** null = bài mới thêm, chưa có trên server. */
  id: string | null
  exerciseId: string
  name: string
  sets: number
  reps: number
  repsMax: number
  loadKg: number | null
  restSeconds: number | null
  removed: boolean
}

type Field = "sets" | "reps" | "repsMax" | "loadKg"

const LOAD_STEP = 2.5
const MAX_SETS = 10
const MAX_REPS = 50
const MAX_LOAD = 500

export function toDraft(exercises: ScheduledExerciseView[]): DraftRow[] {
  return exercises.map((ex) => ({
    key: ex.id,
    id: ex.id,
    exerciseId: ex.exerciseId,
    name: ex.exerciseName,
    sets: ex.targetSets,
    reps: ex.targetReps,
    repsMax: ex.targetRepsMax,
    loadKg: ex.targetLoadKg,
    restSeconds: ex.restSeconds,
    removed: false,
  }))
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Một lần bấm − hoặc +. Tạ null là tự trọng: + thì bắt đầu ở 2,5, − từ 2,5 thì về tự trọng. */
export function nudge(row: DraftRow, field: Field, dir: 1 | -1): DraftRow {
  switch (field) {
    case "sets":
      return { ...row, sets: clamp(row.sets + dir, 1, MAX_SETS) }
    case "reps": {
      const reps = clamp(row.reps + dir, 1, MAX_REPS)
      return { ...row, reps, repsMax: Math.max(row.repsMax, reps) }
    }
    case "repsMax":
      return { ...row, repsMax: clamp(row.repsMax + dir, row.reps, MAX_REPS) }
    case "loadKg": {
      const next = (row.loadKg ?? 0) + dir * LOAD_STEP
      return { ...row, loadKg: next <= 0 ? null : Math.min(next, MAX_LOAD) }
    }
  }
}

/** Việc cần gọi API khi bấm "Lưu": sửa bài cũ đã đổi số, thêm bài mới, xoá bài cũ. */
export function diffDraft(original: ScheduledExerciseView[], draft: DraftRow[]) {
  const before = new Map(original.map((ex) => [ex.id, ex]))
  const updates: DraftRow[] = []
  const adds: DraftRow[] = []
  const removes: string[] = []
  for (const row of draft) {
    if (row.id === null) {
      if (!row.removed) adds.push(row)
      continue
    }
    // Bài không còn trên server (lưu hỏng giữa chừng rồi lịch đã làm mới): không xoá lại, không sửa.
    const ex = before.get(row.id)
    if (!ex) continue
    if (row.removed) {
      removes.push(row.id)
      continue
    }
    if (
      ex.targetSets !== row.sets ||
      ex.targetReps !== row.reps ||
      ex.targetRepsMax !== row.repsMax ||
      ex.targetLoadKg !== row.loadKg
    ) {
      updates.push(row)
    }
  }
  return { updates, adds, removes }
}
