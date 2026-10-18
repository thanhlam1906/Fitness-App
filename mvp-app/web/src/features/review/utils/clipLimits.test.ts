import { describe, expect, it } from "vitest"
import { clipSizeProblem } from "./clipLimits"

const MB = 1024 * 1024

describe("clipSizeProblem", () => {
  it("cho gửi khi từng clip và tổng đều trong giới hạn", () => {
    expect(clipSizeProblem([30 * MB, 30 * MB, 35 * MB])).toBeNull()
  })

  it("chặn tổng 96 MB dù từng clip đều dưới 60 MB", () => {
    expect(clipSizeProblem([32 * MB, 32 * MB, 32 * MB])).toBe("total")
  })

  it("báo clip quá nặng trước khi xét tổng", () => {
    expect(clipSizeProblem([61 * MB, 50 * MB])).toBe("clip")
  })

  it("clip chưa biết cỡ tính 0", () => {
    expect(clipSizeProblem([null, 50 * MB])).toBeNull()
  })
})
