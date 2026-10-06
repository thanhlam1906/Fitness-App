import { describe, expect, it } from "vitest"
import { emptyTemplate, loadedSlugs, missingIncrements, parseKg, pruneIncrements, ruleNumber, toInput } from "@/features/admin/utils/templateForm"
import type { ProgramTemplate } from "@/features/admin/types"

const ex = (slug: string) => ({ slug, sets: 3, repsMin: 5, repsMax: 5, restSec: 90 })

describe("loadedSlugs", () => {
  it("bài có dụng cụ, mỗi slug một lần, theo thứ tự gặp, bỏ dòng chưa chọn bài", () => {
    const days = [
      { label: "A", exercises: [ex("squat"), ex("push-up"), ex("")] },
      { label: "B", exercises: [ex("row"), ex("squat")] },
    ]
    expect(loadedSlugs(days, (s) => s !== "push-up")).toEqual(["squat", "row"])
  })
})

describe("missingIncrements", () => {
  it("null là đã chọn 'Không tự tăng', thiếu khoá mới là chưa chọn", () => {
    expect(missingIncrements(["squat", "kb", "row"], { squat: 2.5, kb: null })).toEqual(["row"])
  })
})

describe("ruleNumber", () => {
  it.each([
    ["PAIN_REPORTED", 1],
    ["PAIN_REPEATED", 1],
    ["LOW_COMPLETION_RATE", 2],
    ["RPE_BELOW_TARGET_STREAK", 3],
    ["RPE_ABOVE_TARGET", 3],
    ["DOUBLE_PROGRESSION_ALL_REPS_MET", 4],
    ["REPEATED_REP_FAILURE", 4],
    ["SETS_MISSED_TARGET", 4],
  ])("%s → %i", (id, n) => expect(ruleNumber(id)).toBe(n))
})

describe("toInput / emptyTemplate", () => {
  it("bỏ id, slug, activeUsers; methodology null thành chuỗi rỗng", () => {
    const t: ProgramTemplate = {
      ...emptyTemplate(),
      id: "1",
      slug: "x",
      methodology: null,
      activeUsers: 3,
    }
    const input = toInput(t)
    expect(input).not.toHaveProperty("id")
    expect(input).not.toHaveProperty("activeUsers")
    expect(input.methodology).toBe("")
  })

  it("template mới tắt sẵn, số quy tắc mặc định như backend", () => {
    const t = emptyTemplate()
    expect(t.active).toBe(false)
    expect(t.progression).toMatchObject({ targetRpe: 8, minCompletionPct: 70, failStreakToDeload: 2, deloadPct: 10 })
  })
})

describe("parseKg", () => {
  it("đọc số thập phân, chấp nhận dấu phẩy, rỗng hoặc chữ là NaN", () => {
    expect(parseKg("1.25")).toBe(1.25)
    expect(parseKg("1.")).toBe(1)
    expect(parseKg("2,5")).toBe(2.5)
    expect(parseKg("  ")).toBeNaN()
    expect(parseKg("abc")).toBeNaN()
  })
})

describe("pruneIncrements", () => {
  it("bỏ khoá không còn trong danh sách bài, giữ null và số", () => {
    expect(pruneIncrements({ squat: 2.5, kb: null, gone: Number.NaN }, ["squat", "kb"])).toEqual({ squat: 2.5, kb: null })
  })
  it("không có gì để bỏ thì trả đúng object cũ", () => {
    const inc = { squat: 2.5 }
    expect(pruneIncrements(inc, ["squat", "row"])).toBe(inc)
  })
})
