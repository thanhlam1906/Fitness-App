import { describe, expect, it } from "vitest"
import type { SessionResponse, SetLogResponse } from "@/features/workout/types"
import { summarizeSession } from "./sessionSummary"
import type { ScheduledExerciseView } from "./types"

function exercise(exerciseId: string, name: string, targetSets: number, targetReps: number): ScheduledExerciseView {
  return {
    id: "se-" + exerciseId, exerciseId, exerciseSlug: exerciseId, exerciseName: name, description: null, muscleGroups: [], stepsVi: [], mistakesVi: [],
    analyzable: false, orderIndex: 1, targetSets, targetReps, targetRepsMax: targetReps + 2,
    targetLoadKg: null, restSeconds: null, substitutedFromName: null, loadDecision: null,
  }
}

function set(exerciseId: string, setIndex: number, reps: number | null, loadKg: number | null, skipReason?: string): SetLogResponse {
  return {
    id: exerciseId + setIndex, exerciseId, setIndex, targetReps: null, reps, loadKg, rpe: null,
    skipped: skipReason !== undefined, skipReason: skipReason ?? null,
  }
}

const session: SessionResponse = {
  id: "s1", userId: "u1", scheduledWorkoutId: "w1", status: "DONE",
  startedAt: "2026-09-24T10:00:00Z", finishedAt: "2026-09-24T10:47:40Z", sessionRpe: 7,
  sets: [
    set("squat", 2, 5, 60), set("squat", 1, 5, 60), set("squat", 3, 4, 60),
    set("pushup", 1, 10, null), set("pushup", 2, null, null, "TIRED"),
  ],
}
const plan = [exercise("squat", "Squat tạ đòn", 3, 5), exercise("pushup", "Chống đẩy", 3, 10)]

describe("summarizeSession", () => {
  const summary = summarizeSession(session, plan)

  it("thời gian làm tròn theo phút", () => expect(summary.minutes).toBe(48))

  it("tổng tạ chỉ tính set có kg, không tính set bỏ qua", () => expect(summary.totalKg).toBe(60 * 14))

  it("set xếp theo thứ tự, thiếu rep so với mục tiêu thì đánh dấu", () => {
    expect(summary.rows[0].sets.map((s) => [s.reps, s.short])).toEqual([[5, false], [5, false], [4, true]])
    expect(summary.rows[0].loads).toEqual([60])
  })

  it("set bỏ qua giữ lý do, không bị tính là thiếu rep", () => {
    const skipped = summary.rows[1].sets[1]
    expect(skipped).toMatchObject({ skipped: true, skipReason: "TIRED", short: false })
    expect(summary.rows[1].loads).toEqual([])
  })

  it("tổng tạ tính một lần trên mọi set, kể cả bài không còn trong lịch hay bài trùng", () => {
    const withExtra = { ...session, sets: [...session.sets, set("gone", 1, 5, 20)] }
    expect(summarizeSession(withExtra, [...plan, plan[0]]).totalKg).toBe(60 * 14 + 100)
  })

  it("buổi chưa kết thúc thì chưa có thời gian", () =>
    expect(summarizeSession({ ...session, finishedAt: null }, plan).minutes).toBeNull())
})
