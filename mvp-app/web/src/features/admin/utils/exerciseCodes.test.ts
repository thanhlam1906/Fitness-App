import { describe, expect, it } from "vitest"
import { setPrimaryMuscle, toggleEquipment, toggleSecondaryMuscle } from "./exerciseCodes"

describe("setPrimaryMuscle", () => {
  it("bài chưa có nhóm cơ: cơ chính thành phần tử duy nhất", () => {
    expect(setPrimaryMuscle([], "QUADS")).toEqual(["QUADS"])
  })

  it("đổi cơ chính giữ nguyên cơ phụ", () => {
    expect(setPrimaryMuscle(["QUADS", "GLUTES", "CORE"], "CHEST")).toEqual(["CHEST", "GLUTES", "CORE"])
  })

  it("chọn một cơ phụ làm cơ chính thì nó rời hàng cơ phụ", () => {
    expect(setPrimaryMuscle(["QUADS", "GLUTES", "CORE"], "GLUTES")).toEqual(["GLUTES", "CORE"])
  })
})

describe("toggleSecondaryMuscle", () => {
  it("bật cơ phụ: cơ chính vẫn đứng đầu, cơ phụ theo thứ tự cố định của danh sách", () => {
    expect(toggleSecondaryMuscle(["QUADS", "CORE"], "GLUTES")).toEqual(["QUADS", "GLUTES", "CORE"])
  })

  it("tắt cơ phụ đang bật", () => {
    expect(toggleSecondaryMuscle(["QUADS", "GLUTES", "CORE"], "GLUTES")).toEqual(["QUADS", "CORE"])
  })

  it("không đụng tới cơ chính, kể cả khi bấm vào mã của nó", () => {
    expect(toggleSecondaryMuscle(["QUADS", "CORE"], "QUADS")).toEqual(["QUADS", "CORE"])
  })

  it("chưa có cơ chính thì không bật được cơ phụ", () => {
    expect(toggleSecondaryMuscle([], "CORE")).toEqual([])
  })
})

describe("toggleEquipment", () => {
  it("bật, tắt, và luôn theo thứ tự của danh sách thiết bị", () => {
    expect(toggleEquipment([], "BENCH")).toEqual(["BENCH"])
    expect(toggleEquipment(["BENCH"], "DUMBBELL")).toEqual(["DUMBBELL", "BENCH"])
    expect(toggleEquipment(["DUMBBELL", "BENCH"], "DUMBBELL")).toEqual(["BENCH"])
  })
})
