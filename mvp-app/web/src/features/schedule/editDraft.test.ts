import { describe, expect, it } from "vitest"
import { diffDraft, nudge, toDraft, type DraftRow } from "./editDraft"
import type { ScheduledExerciseView } from "./types"

const squat: ScheduledExerciseView = {
  id: "se1", exerciseId: "squat", exerciseSlug: "squat", exerciseName: "Squat", description: null,
  analyzable: true, orderIndex: 1, targetSets: 3, targetReps: 5, targetRepsMax: 8,
  targetLoadKg: 60, restSeconds: 120, substitutedFromName: null, loadDecision: null,
}
const row = toDraft([squat])[0]

describe("nudge", () => {
  it("tạ đổi 2,5 kg mỗi lần", () => expect(nudge(row, "loadKg", 1).loadKg).toBe(62.5))

  it("tạ tự trọng (null) bấm + thành 2,5; từ 2,5 bấm − về tự trọng", () => {
    expect(nudge({ ...row, loadKg: null }, "loadKg", 1).loadKg).toBe(2.5)
    expect(nudge({ ...row, loadKg: 2.5 }, "loadKg", -1).loadKg).toBeNull()
  })

  it("set kẹp trong 1–10", () => {
    expect(nudge({ ...row, sets: 1 }, "sets", -1).sets).toBe(1)
    expect(nudge({ ...row, sets: 10 }, "sets", 1).sets).toBe(10)
  })

  it("rep từ vượt rep đến thì rep đến đi theo", () =>
    expect(nudge({ ...row, reps: 8, repsMax: 8 }, "reps", 1)).toMatchObject({ reps: 9, repsMax: 9 }))

  it("rep đến không xuống dưới rep từ", () =>
    expect(nudge({ ...row, reps: 8, repsMax: 8 }, "repsMax", -1).repsMax).toBe(8))
})

describe("diffDraft", () => {
  it("không đổi gì thì không có việc", () =>
    expect(diffDraft([squat], toDraft([squat]))).toEqual({ updates: [], adds: [], removes: [] }))

  it("tách sửa, thêm, xoá", () => {
    const added: DraftRow = { key: "new-1", id: null, exerciseId: "row", name: "Chèo", sets: 3, reps: 8, repsMax: 12, loadKg: null, restSeconds: null, removed: false }
    const draft = [{ ...row, loadKg: 62.5 }, added]
    expect(diffDraft([squat], draft)).toEqual({ updates: [{ ...row, loadKg: 62.5 }], adds: [added], removes: [] })
    expect(diffDraft([squat], [{ ...row, removed: true }]).removes).toEqual(["se1"])
  })

  // Lưu hỏng giữa chừng: lịch đã làm mới nhưng nháp còn giữ bài đã xoá trên server.
  it("bỏ qua bài không còn trên server, không xoá lại, không sửa", () => {
    expect(diffDraft([], [{ ...row, removed: true }]).removes).toEqual([])
    expect(diffDraft([], [{ ...row, loadKg: 70 }]).updates).toEqual([])
  })

  it("bài vừa thêm rồi xoá ngay thì không gọi API nào", () => {
    const addedThenRemoved: DraftRow = { key: "new-1", id: null, exerciseId: "row", name: "Chèo", sets: 3, reps: 8, repsMax: 12, loadKg: null, restSeconds: null, removed: true }
    expect(diffDraft([squat], [row, addedThenRemoved])).toEqual({ updates: [], adds: [], removes: [] })
  })
})
