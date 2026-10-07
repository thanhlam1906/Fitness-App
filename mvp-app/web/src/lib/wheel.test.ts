import { describe, expect, it } from "vitest"
import { indexAtScroll, joinTenths, nearestIndex, range, splitTenths } from "./wheel"

describe("wheel", () => {
  it("range gồm cả hai đầu", () => expect(range(2, 6)).toEqual([2, 3, 4, 5, 6]))

  it("nearestIndex: giá trị có trong cột", () => expect(nearestIndex([120, 121, 122], 121)).toBe(1))

  it("nearestIndex: giá trị cũ ngoài bước cột lấy số gần nhất", () =>
    expect(nearestIndex(range(120, 220), 172.6)).toBe(53))

  it("nearestIndex: ngoài khoảng thì kẹp về đầu cột", () => {
    expect(nearestIndex(range(120, 220), 90)).toBe(0)
    expect(nearestIndex(range(120, 220), 300)).toBe(100)
  })

  it("indexAtScroll làm tròn theo ô và kẹp trong cột", () => {
    expect(indexAtScroll(0, 44, 5)).toBe(0)
    expect(indexAtScroll(65, 44, 5)).toBe(1)
    expect(indexAtScroll(67, 44, 5)).toBe(2)
    expect(indexAtScroll(9999, 44, 5)).toBe(4)
    expect(indexAtScroll(-10, 44, 5)).toBe(0)
  })

  it("splitTenths tách phần nguyên và phần lẻ", () => {
    expect(splitTenths(65)).toEqual([65, 0])
    expect(splitTenths(65.3)).toEqual([65, 3])
    // numeric(5,2) ở DB có thể có 2 số lẻ: làm tròn tới 0,1 trước khi tách.
    expect(splitTenths(65.96)).toEqual([66, 0])
  })

  it("joinTenths ghép lại không lệch số thực", () => {
    expect(joinTenths(65, 3)).toBe(65.3)
    expect(joinTenths(70, 0)).toBe(70)
  })
})
