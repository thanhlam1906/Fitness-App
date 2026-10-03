import { describe, expect, it } from "vitest"
import { formatTarget, previewDates, programDays, shortDayTitle } from "./programDays"
import type { ScheduledExerciseView, ScheduledWorkoutView } from "@/features/schedule/types"

const ex = (id: string, sets = 3, reps = 5, repsMax = 5, load: number | null = null): ScheduledExerciseView => ({
  id, exerciseId: `ex-${id}`, exerciseSlug: id, exerciseName: id, description: null, muscleGroups: [], stepsVi: [], mistakesVi: [], analyzable: false,
  orderIndex: 1, targetSets: sets, targetReps: reps, targetRepsMax: repsMax, targetLoadKg: load,
  restSeconds: null, substitutedFromName: null, loadDecision: null,
})
const w = (date: string, label: string, status: ScheduledWorkoutView["status"], exercises = [ex(label)], inProgress = false): ScheduledWorkoutView => ({
  id: `${date}-${label}`, scheduledOn: date, weekIndex: 1, label, status, inProgress, exercises,
})
const TODAY = "2026-09-27" // chủ nhật

describe("programDays", () => {
  const workouts = [
    w("2026-09-24", "A", "DONE", [ex("a-cu")]),
    w("2026-09-25", "B", "MISSED"),
    w("2026-09-28", "A", "PLANNED", [ex("a-moi")]),
    w("2026-09-29", "B", "PLANNED"),
    w("2026-09-30", "A", "PLANNED"),
    w("2026-09-26", "C", "DONE", [ex("c-cuoi")]),
  ]

  it("giữ thứ tự nhãn xuất hiện đầu tiên trên lịch", () =>
    expect(programDays(workouts, TODAY).map((d) => d.label)).toEqual(["A", "B", "C"]))

  it("buổi tới là buổi PLANNED sớm nhất từ hôm nay, đếm số buổi còn lại", () => {
    const a = programDays(workouts, TODAY)[0]
    expect(a.next?.scheduledOn).toBe("2026-09-28")
    expect(a.remaining).toBe(2)
    expect(a.exercises[0].id).toBe("a-moi")
  })

  it("nhãn đã tập hết: không có buổi tới, bài lấy từ buổi gần nhất", () => {
    const c = programDays(workouts, TODAY)[2]
    expect(c.next).toBeNull()
    expect(c.remaining).toBe(0)
    expect(c.exercises[0].id).toBe("c-cuoi")
  })
})

describe("formatTarget", () => {
  it("rep cố định, không tạ", () => expect(formatTarget(ex("x", 3, 8, 8))).toBe("3×8"))
  it("khoảng rep kèm tạ", () => expect(formatTarget(ex("x", 4, 6, 8, 32.5))).toBe("4×6–8 · 32,5 kg"))
})

it("shortDayTitle", () => expect(shortDayTitle("2026-09-28")).toBe("T2 28/9"))

describe("previewDates", () => {
  const workouts = [
    w("2026-09-27", "A", "DONE"),
    w("2026-09-28", "B", "PLANNED"),
    w("2026-09-29", "A", "PLANNED"),
    w("2026-09-30", "B", "PLANNED"),
  ]

  it("dời theo thứ mới, giữ thứ tự, bỏ qua ngày đã có buổi đã tập", () =>
    // T2, T4, CN: CN 27 đã tập → T2 28, T4 30, CN 4/10.
    expect(previewDates(workouts, [1, 3, 7], TODAY, "2026-09-01", 3)).toEqual([
      { date: "2026-09-28", label: "B" },
      { date: "2026-09-30", label: "A" },
      { date: "2026-10-04", label: "B" },
    ]))

  it("buổi đang tập dở giữ nguyên ngày, không tính là buổi mở", () => {
    const withSession = [w("2026-09-27", "A", "PLANNED", [ex("A")], true), ...workouts.slice(1)]
    expect(programDays(withSession, TODAY)[0].remaining).toBe(1)
    // CN 27 đang tập dở → chiếm ngày đó, buổi mở đầu tiên sang T2 28.
    expect(previewDates(withSession, [1, 3, 7], TODAY, "2026-09-01", 1)).toEqual([{ date: "2026-09-28", label: "B" }])
  })

  it("chưa chọn ngày nào thì không xem trước", () =>
    expect(previewDates(workouts, [], TODAY, "2026-09-01", 3)).toEqual([]))
})
