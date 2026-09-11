import { describe, expect, it } from "vitest"
import { draftError, toCustomProgramRequest, type Draft } from "./customProgram"

const draft: Draft = {
  1: [{ exerciseId: "ex-1", sets: "4", repsMin: "8", repsMax: "12", loadKg: "40" }],
  5: [{ exerciseId: "ex-2", sets: "3", repsMin: "10", repsMax: "10", loadKg: "" }],
}

describe("toCustomProgramRequest", () => {
  it("gửi từng thứ kèm bài tập, số đã ép về number", () => {
    const request = toCustomProgramRequest(draft, "2026-09-14", 4)

    expect(request).toEqual({
      startDate: "2026-09-14",
      weeksToGenerate: 4,
      days: [
        {
          dayOfWeek: 1,
          label: "T2",
          exercises: [
            { exerciseId: "ex-1", sets: 4, repsMin: 8, repsMax: 12, loadKg: 40, restSeconds: null },
          ],
        },
        {
          dayOfWeek: 5,
          label: "T6",
          exercises: [
            { exerciseId: "ex-2", sets: 3, repsMin: 10, repsMax: 10, loadKg: null, restSeconds: null },
          ],
        },
      ],
    })
  })

  it("bỏ trống tạ thành null chứ không phải 0 — 0kg là một mức tạ có thật", () => {
    const request = toCustomProgramRequest(draft, "2026-09-14", 4)
    expect(request.days[1].exercises[0].loadKg).toBeNull()
  })
})

describe("draftError", () => {
  it("không có ngày nào thì báo lỗi", () => {
    expect(draftError({})).toBe("Chọn ít nhất một ngày tập.")
  })

  it("ngày đã chọn mà chưa có bài nào thì báo lỗi", () => {
    expect(draftError({ 1: [] })).toBe("Mỗi ngày tập cần ít nhất một bài.")
  })

  it("rep tối đa nhỏ hơn rep tối thiểu thì báo lỗi", () => {
    expect(
      draftError({ 1: [{ exerciseId: "ex-1", sets: "3", repsMin: "10", repsMax: "8", loadKg: "" }] }),
    ).toBe("Rep tối đa phải lớn hơn hoặc bằng rep tối thiểu.")
  })

  it("draft hợp lệ thì không có lỗi", () => {
    expect(draftError(draft)).toBeNull()
  })
})
