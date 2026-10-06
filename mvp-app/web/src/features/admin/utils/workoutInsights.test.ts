import { describe, expect, it } from "vitest"
import {
  bodyAreaLabel,
  percent,
  readInsightsFilter,
  ruleLabel,
  skipReasonLabel,
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
