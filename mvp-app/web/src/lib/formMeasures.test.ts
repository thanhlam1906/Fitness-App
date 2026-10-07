import { describe, expect, it } from "vitest"
import { measuresFor, rangeText, shortRule, zones } from "./formMeasures"

describe("formMeasures", () => {
  it("mỗi góc chỉ có số đo đo đúng ở góc đó", () => {
    expect(measuresFor("FRONTAL")).toEqual(expect.arrayContaining(["valgus", "asym_knee", "shoulder"]))
    expect(measuresFor("FRONTAL")).not.toContain("knee")
    expect(measuresFor("SAGITTAL")).toEqual(expect.arrayContaining(["knee", "torso", "line"]))
    expect(measuresFor("SAGITTAL")).not.toContain("valgus")
    expect(measuresFor("DIAGONAL")).toHaveLength(11)
  })

  it("vùng xanh, vàng cho ba dạng khoảng", () => {
    expect(zones({ from: null, to: 100, warn: 15 }, 180)).toEqual({ pass: [0, 100], warn: [[100, 115]] })
    expect(zones({ from: 165, to: null, warn: 10 }, 180)).toEqual({ pass: [165, 180], warn: [[155, 165]] })
    expect(zones({ from: 80, to: 110, warn: 10 }, 180)).toEqual({ pass: [80, 110], warn: [[70, 80], [110, 120]] })
    expect(zones({ from: null, to: 175, warn: 15 }, 180).warn).toEqual([[175, 180]])
    expect(zones({ from: null, to: 100, warn: 0 }, 180).warn).toEqual([])
  })

  it("câu luật dài cho màn kết quả, ngắn cho danh sách", () => {
    expect(rangeText({ from: null, to: 100 })).toBe("không quá 100°")
    expect(rangeText({ from: 165, to: null })).toBe("ít nhất 165°")
    expect(rangeText({ from: 80, to: 110 })).toBe("từ 80° đến 110°")
    expect(shortRule({ from: null, to: 100 })).toBe("≤ 100°")
    expect(shortRule({ from: 165, to: null })).toBe("≥ 165°")
    expect(shortRule({ from: 80, to: 110 })).toBe("80–110°")
  })
})
