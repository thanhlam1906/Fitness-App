import { describe, expect, it } from "vitest"
import { fromLines, toLines } from "./lineList"

describe("fromLines", () => {
  it("cắt khoảng trắng đầu cuối mỗi dòng, bỏ dòng trống", () => {
    expect(fromLines("  a \n\n b\n")).toEqual(["a", "b"])
  })

  it("chấp nhận cả xuống dòng kiểu Windows", () => {
    expect(fromLines("a\r\nb")).toEqual(["a", "b"])
  })

  it("chuỗi rỗng là danh sách rỗng", () => {
    expect(fromLines("")).toEqual([])
  })
})

describe("toLines", () => {
  it("nối bằng xuống dòng", () => {
    expect(toLines(["a", "b"])).toBe("a\nb")
  })

  it("danh sách rỗng là chuỗi rỗng", () => {
    expect(toLines([])).toBe("")
  })
})
