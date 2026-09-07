import { describe, expect, it } from "vitest"
import { formatKg } from "./format"

describe("formatKg", () => {
  it("bỏ .0 thừa với số nguyên", () => {
    expect(formatKg(60)).toBe("60 kg")
  })

  it("giữ 1 số lẻ với tải tạ đơn", () => {
    expect(formatKg(2.5)).toBe("2.5 kg")
  })

  it("làm tròn 1 số lẻ", () => {
    expect(formatKg(60.04)).toBe("60 kg")
  })

  it("null/undefined hiển thị gạch ngang, không phải NaN hay rỗng", () => {
    expect(formatKg(null)).toBe("—")
    expect(formatKg(undefined)).toBe("—")
  })
})
