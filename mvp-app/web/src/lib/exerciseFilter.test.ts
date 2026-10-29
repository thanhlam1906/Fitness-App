import { describe, expect, it } from "vitest"
import { filterExercises, muscleChips, normalizeVi } from "./exerciseFilter"

const squat = { nameEn: "Bodyweight Squat", nameVi: "Squat tay không", muscleGroups: ["QUADS", "GLUTES"] }
const pushUp = { nameEn: "Push-up", nameVi: "Chống đẩy", muscleGroups: ["CHEST", "TRICEPS"] }
const bench = { nameEn: "Bench Press", nameVi: "Đẩy ngực", muscleGroups: ["CHEST"] }
const lunge = { nameEn: "Reverse Lunge", nameVi: null, muscleGroups: ["QUADS"] }
const all = [squat, pushUp, bench, lunge]

describe("normalizeVi", () => {
  it("bỏ dấu, đổi đ thành d, chữ thường", () => {
    expect(normalizeVi("Đẩy Ngực")).toBe("day nguc")
  })
})

describe("filterExercises", () => {
  it("gõ không dấu vẫn khớp tên Việt", () => {
    expect(filterExercises(all, "day nguc", null)).toEqual([bench])
  })

  it("khớp cả tên Anh, không phân biệt hoa thường", () => {
    expect(filterExercises(all, "SQUAT", null)).toEqual([squat])
  })

  it("lọc theo nhóm cơ phụ, không chỉ cơ chính", () => {
    expect(filterExercises(all, "", "TRICEPS")).toEqual([pushUp])
  })

  it("ô tìm trống và không chọn nhóm thì trả cả danh sách", () => {
    expect(filterExercises(all, "  ", null)).toEqual(all)
  })
})

describe("muscleChips", () => {
  it("chỉ gồm nhóm đang có bài, theo thứ tự MUSCLE_OPTIONS", () => {
    expect(muscleChips(all).map((c) => c.value)).toEqual(["QUADS", "GLUTES", "CHEST", "TRICEPS"])
  })
})
