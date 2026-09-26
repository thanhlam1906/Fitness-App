import type { SessionResponse } from "@/features/workout/types"
import type { ScheduledExerciseView } from "./types"

export type LoggedSet = {
  setIndex: number
  reps: number | null
  loadKg: number | null
  /** Làm được ít rep hơn mục tiêu của bài. Set bỏ qua không tính là thiếu. */
  short: boolean
  skipped: boolean
  skipReason: string | null
}

export type SessionSummary = {
  minutes: number | null
  totalKg: number
  rows: { exercise: ScheduledExerciseView; sets: LoggedSet[]; loads: number[] }[]
}

/**
 * Thẻ "đã tập" của màn Lịch (doc/design-ui-m3-v1.md §2). Con số do code tính từ set
 * đã log, không qua LLM. Bài xếp theo lịch; set của bài không còn trong lịch (hiếm,
 * vd bài đã bị xoá khỏi buổi sau khi tập) không có hàng riêng nhưng vẫn vào tổng tạ.
 */
export function summarizeSession(session: SessionResponse, exercises: ScheduledExerciseView[]): SessionSummary {
  const minutes =
    session.finishedAt === null
      ? null
      : Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60000)

  // Tính một lần trên mọi set đã log: bài trùng trong lịch không bị cộng đôi, bài đã bị
  // xoá khỏi lịch sau khi tập vẫn được tính.
  const totalKg = session.sets.reduce(
    (sum, s) => (!s.skipped && s.reps !== null && s.loadKg !== null ? sum + s.reps * s.loadKg : sum),
    0,
  )
  const rows = exercises.map((exercise) => {
    const sets = session.sets
      .filter((s) => s.exerciseId === exercise.exerciseId)
      .sort((a, b) => a.setIndex - b.setIndex)
      .map((s) => ({
        setIndex: s.setIndex,
        reps: s.reps,
        loadKg: s.loadKg,
        short: !s.skipped && s.reps !== null && s.reps < exercise.targetReps,
        skipped: s.skipped,
        skipReason: s.skipReason,
      }))
    // Mức tạ khác nhau giữa các set (vd hạ tạ giữa chừng) thì thẻ hiện từng mức.
    const loads = [...new Set(sets.filter((s) => !s.skipped && s.loadKg !== null).map((s) => s.loadKg!))]
    return { exercise, sets, loads }
  })

  return { minutes, totalKg, rows }
}
