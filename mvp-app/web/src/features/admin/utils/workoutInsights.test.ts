import { describe, expect, it } from "vitest"
import {
  bodyAreaLabel,
  donutArcs,
  painSlices,
  percent,
  readInsightsFilter,
  ruleLabel,
  skipReasonLabel,
  skipReasonSlices,
  topSkipReason,
  writeInsightsFilter,
} from "@/features/admin/utils/workoutInsights"

describe("bộ lọc trang Buổi tập", () => {
  it("mặc định tất cả template, 30 ngày", () => {
    expect(readInsightsFilter(new URLSearchParams())).toEqual({ templateId: null, days: 30 })
  })

  it("đọc template và số ngày hợp lệ", () => {
    expect(readInsightsFilter(new URLSearchParams("template=abc&days=7"))).toEqual({ templateId: "abc", days: 7 })
  })

  it("số ngày lạ quay về 30", () => {
    expect(readInsightsFilter(new URLSearchParams("days=14")).days).toBe(30)
  })

  it("ghi ra rồi đọc lại được đúng như cũ", () => {
    const filter = { templateId: "abc", days: 90 } as const
    expect(readInsightsFilter(writeInsightsFilter(filter))).toEqual(filter)
    expect(writeInsightsFilter({ templateId: null, days: 30 }).has("template")).toBe(false)
  })
})

describe("nhãn", () => {
  it("quy tắc có nhãn tiếng Việt, mã lạ hiện nguyên mã, null là gạch", () => {
    expect(ruleLabel("RPE_ABOVE_TARGET")).toBe("RPE quá cao")
    expect(ruleLabel("NEW_RULE")).toBe("NEW_RULE")
    expect(ruleLabel(null)).toBe("—")
  })

  it("lý do bỏ và vùng đau dùng lại nhãn của màn tập", () => {
    expect(skipReasonLabel("TIRED")).toBe("Mệt")
    expect(skipReasonLabel(null)).toBe("—")
    expect(bodyAreaLabel("KNEE_L")).toBe("Gối trái")
    expect(bodyAreaLabel("ANKLE")).toBe("ANKLE")
  })

  it("phần trăm làm tròn, mẫu số 0 là gạch", () => {
    expect(percent(1, 3)).toBe("33%")
    expect(percent(0, 0)).toBe("—")
  })
})

describe("biểu đồ tròn", () => {
  it("cung chia theo tỉ lệ, chừa khe 2, phần 0 không vẽ", () => {
    expect(donutArcs([1, 0, 3], 100)).toEqual([
      { length: 23, offset: 0 },
      { length: 0, offset: 25 },
      { length: 73, offset: 25 },
    ])
  })

  it("tổng 0 thì không có cung nào", () => {
    expect(donutArcs([0, 0], 100).every((a) => a.length === 0)).toBe(true)
  })

  it("vùng đau thêm phần Khác cho số lần ngoài top 5", () => {
    const s = painSlices([{ bodyArea: "KNEE_L", reports: 3, users: 2, avgSeverity: 2.5, topExerciseName: "Squat" }], 5)
    expect(s.map((x) => [x.label, x.value])).toEqual([["Gối trái", 3], ["Khác", 2]])
    expect(s[0].detail).toBe("2 người · mức TB 2.5 · hay có Squat")
  })

  it("phần Khác gộp có khoá riêng, không trùng vùng OTHER thật", () => {
    const s = painSlices([{ bodyArea: "OTHER", reports: 2, users: 1, avgSeverity: 1, topExerciseName: null }], 5)
    expect(s.map((x) => x.key)).toEqual(["OTHER", "__rest"])
    expect(s.map((x) => x.label)).toEqual(["Chỗ khác", "Khác"])
  })

  it("không thêm Khác khi top 5 đã đủ tổng", () => {
    expect(painSlices([{ bodyArea: "WRIST", reports: 2, users: 1, avgSeverity: 1, topExerciseName: null }], 2)).toHaveLength(1)
  })

  it("lý do bỏ set giữ thứ tự và màu theo vị trí", () => {
    const s = skipReasonSlices([{ key: "TIRED", count: 0 }, { key: "PAIN", count: 4 }])
    expect(s.map((x) => [x.label, x.color])).toEqual([["Mệt", "var(--color-chart-1)"], ["Đau", "var(--color-chart-2)"]])
  })

  it("lý do chính là lý do nhiều nhất; không có set bỏ thì null", () => {
    expect(topSkipReason([{ key: "TIRED", count: 1 }, { key: "PAIN", count: 4 }])).toBe("Đau")
    expect(topSkipReason([{ key: "TIRED", count: 0 }])).toBeNull()
  })
})
