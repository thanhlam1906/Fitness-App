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

  it("gõ nhiều từ, thứ tự nào cũng khớp", () => {
    expect(filterExercises(all, "squat bodyweight", null)).toEqual([squat])
    expect(filterExercises(all, "squat bench", null)).toEqual([])
  })

  it("xếp theo độ khớp: đầu tên, rồi đầu một từ, rồi giữa từ; cùng mức giữ thứ tự đưa vào", () => {
    // Danh sách đưa vào đã theo ABC như ở nơi gọi: cùng mức khớp thì vẫn ABC.
    const arrow = { nameEn: "arrow stretch", nameVi: null, muscleGroups: [] }
    const upright = { nameEn: "barbell upright row", nameVi: null, muscleGroups: [] }
    const bentOver = { nameEn: "Bent-over Row", nameVi: null, muscleGroups: [] }
    const rowing = { nameEn: "Rowing machine", nameVi: null, muscleGroups: [] }
    expect(filterExercises([arrow, upright, bentOver, rowing], "row", null)).toEqual([rowing, upright, bentOver, arrow])
  })

  it("từ gõ có gạch nối vẫn tính là đầu từ: 'wide push-up' xếp trên bài chỉ khớp giữa từ", () => {
    const wide = { nameEn: "Wide Grip Push-up", nameVi: null, muscleGroups: [] }
    const mid = { nameEn: "awide xpush-up drill", nameVi: null, muscleGroups: [] }
    expect(filterExercises([mid, wide], "wide push-up", null)).toEqual([wide, mid])
  })
})

describe("muscleChips", () => {
  it("chỉ gồm nhóm đang có bài, theo thứ tự MUSCLE_OPTIONS", () => {
    expect(muscleChips(all).map((c) => c.value)).toEqual(["QUADS", "GLUTES", "CHEST", "TRICEPS"])
  })
})
