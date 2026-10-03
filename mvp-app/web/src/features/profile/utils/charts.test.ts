import { describe, expect, it } from "vitest"
import { barHeights, weightSeries } from "./charts"
import type { BodyMetric } from "@/features/profile/types"

const m = (measuredOn: string, weightKg: number | null): BodyMetric => ({ measuredOn, weightKg, heightCm: 172 })

describe("weightSeries", () => {
  it("cũ trước mới sau, bỏ lần đo không có cân nặng, chênh = mới nhất − lần đầu", () => {
    // API trả mới nhất trước.
    const s = weightSeries([m("2026-09-25", 72.5), m("2026-09-01", null), m("2026-08-04", 74.2)], 300, 100, 10)
    expect(s.points.map((p) => p.measuredOn)).toEqual(["2026-08-04", "2026-09-25"])
    expect(s.delta).toBe(-1.7)
    expect(s.points[0].x).toBe(10)
    expect(s.points[1].x).toBe(290)
    // Nặng nhất ở trên cùng, nhẹ nhất ở dưới cùng.
    expect(s.points[0].y).toBe(10)
    expect(s.points[1].y).toBe(90)
    expect(s.path).toBe("M10 10 L290 90")
  })

  it("một lần đo: không có mức chênh, điểm nằm giữa", () => {
    const s = weightSeries([m("2026-09-25", 72.5)], 300, 100, 10)
    expect(s.delta).toBeNull()
    expect(s.points).toEqual([{ x: 150, y: 50, kg: 72.5, measuredOn: "2026-09-25" }])
  })

  it("mọi lần bằng nhau: đường nằm ngang, không chia cho 0", () => {
    const s = weightSeries([m("2026-09-25", 70), m("2026-09-18", 70)], 300, 100, 10)
    expect(s.points.map((p) => p.y)).toEqual([50, 50])
    expect(s.delta).toBe(0)
  })

  it("chưa có lần đo nào", () => {
    expect(weightSeries([], 300, 100, 10)).toEqual({ points: [], path: "", delta: null })
  })
})

describe("barHeights", () => {
  it("cột cao nhất bằng maxPx, còn lại theo tỉ lệ", () => {
    expect(barHeights([0, 200, 400], 80)).toEqual([0, 40, 80])
  })
  it("toàn 0 thì cột 0, không chia cho 0", () => {
    expect(barHeights([0, 0], 80)).toEqual([0, 0])
  })
})
