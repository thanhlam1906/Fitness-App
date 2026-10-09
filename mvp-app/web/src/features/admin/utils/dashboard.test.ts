import { describe, expect, it } from "vitest"
import type { AdminDashboard } from "@/features/admin/types"
import {
  completionRows,
  formCheckRows,
  goalSlices,
  lineCoords,
  overallCompletion,
  pointLabel,
  programsWithSessions,
  rateColor,
  wrongTotal,
} from "@/features/admin/utils/dashboard"

const program = (name: string, users: number, done: number, missed: number) => ({
  templateId: name,
  name,
  users,
  done,
  missed,
})

describe("mục tiêu người đang tập", () => {
  const goals: AdminDashboard["goals"] = [
    { goal: "MUSCLE", users: 10 },
    { goal: "FAT_LOSS", users: 31 },
    { goal: "STRENGTH", users: 0 },
    { goal: "GENERAL", users: 9 },
    { goal: "NONE", users: 50 },
  ]

  it("đông nhất lên đầu, Chưa chọn luôn cuối dù đông hơn", () => {
    expect(goalSlices(goals).map((s) => s.label)).toEqual([
      "Giảm mỡ",
      "Tăng cơ",
      "Sức khoẻ chung",
      "Tăng sức mạnh",
      "Chưa chọn",
    ])
  })

  it("màu gắn theo mục tiêu, không theo hạng", () => {
    const colors = Object.fromEntries(goalSlices(goals).map((s) => [s.key, s.color]))
    expect(colors.MUSCLE).toBe("var(--color-chart-1)")
    expect(colors.FAT_LOSS).toBe("var(--color-chart-2)")
    expect(colors.NONE).toBe("var(--color-chart-neutral)")
  })
})

describe("hoàn thành theo chương trình", () => {
  it("tỉ lệ = đã tập / (đã tập + lỡ), sắp giảm dần, chưa có buổi cuối", () => {
    const rows = completionRows([program("B", 1, 3, 3), program("C", 4, 0, 0), program("A", 2, 8, 2)])
    expect(rows.map((r) => [r.name, r.label])).toEqual([
      ["A", "80%"],
      ["B", "50%"],
    ])
    expect(rows[0].value).toBeCloseTo(0.8)
  })

  it("thu gọn: lấy các chương trình nhiều buổi nhất rồi mới xếp theo tỉ lệ", () => {
    const programs = [
      program("ít buổi, 100%", 1, 2, 0),
      program("đông, 50%", 40, 50, 50),
      program("vừa, 90%", 10, 18, 2),
      program("không buổi", 3, 0, 0),
    ]
    expect(completionRows(programs, 2).map((r) => r.name)).toEqual(["vừa, 90%", "đông, 50%"])
    expect(programsWithSessions(programs)).toHaveLength(3)
  })

  it("dòng phụ ghi số người, buổi đã tập, buổi lỡ", () => {
    expect(completionRows([program("A", 34, 168, 32)])[0].sub).toBe("34 người · 168 buổi · 32 lỡ")
  })

  it("hoà tỉ lệ thì chương trình nhiều buổi hơn lên trước", () => {
    const rows = completionRows([program("ít", 1, 1, 1), program("nhiều", 1, 10, 10)])
    expect(rows.map((r) => r.name)).toEqual(["nhiều", "ít"])
  })

  it("tỉ lệ chung cộng mọi chương trình, không trung bình các tỉ lệ", () => {
    expect(overallCompletion([program("A", 1, 9, 1), program("B", 1, 1, 9)])).toBe("50%")
    expect(overallCompletion([])).toBe("—")
  })

  it("mốc màu: từ 80% xanh, từ 60% vàng, dưới đó đỏ", () => {
    expect(rateColor(0.8)).toBe("var(--color-success)")
    expect(rateColor(0.79)).toBe("var(--color-warn)")
    expect(rateColor(0.6)).toBe("var(--color-warn)")
    expect(rateColor(0.59)).toBe("var(--color-danger)")
  })
})

describe("hoạt động theo thời gian", () => {
  it("nhãn điểm: ngày là d/m, tuần thêm 'Tuần từ' ở nhãn dài", () => {
    expect(pointLabel("2026-10-09", "DAY")).toEqual({ short: "9/10", long: "9/10" })
    expect(pointLabel("2026-01-03", "WEEK")).toEqual({ short: "3/1", long: "Tuần từ 3/1" })
  })

  it("góp ý bị báo sai của một điểm cộng đủ ba nguồn", () => {
    expect(wrongTotal({ start: "2026-10-09", wrongForm: 2, wrongLoad: 1, wrongAssistant: 3, questions: 9, askers: 4 })).toBe(6)
  })

  it("toạ độ đường: điểm đầu sát trái, điểm cuối sát phải, số lớn nhất ở mép trên trừ lề", () => {
    expect(lineCoords([0, 5, 10], 100, 50, 5)).toEqual([
      { x: 0, y: 45 },
      { x: 50, y: 25 },
      { x: 100, y: 5 },
    ])
  })

  it("toạ độ đường: toàn số 0 thì nằm sát đáy, một điểm thì ở giữa", () => {
    expect(lineCoords([0, 0], 100, 50, 5).map((p) => p.y)).toEqual([45, 45])
    expect(lineCoords([3], 100, 50, 5)).toEqual([{ x: 50, y: 5 }])
  })
})

describe("bài được chấm form nhiều nhất", () => {
  it("thanh dài theo lượt, dòng phụ là số người", () => {
    const rows = formCheckRows([
      { exerciseId: "a", name: "Squat", checks: 12, users: 5 },
      { exerciseId: "b", name: "Deadlift", checks: 3, users: 3 },
    ])
    expect(rows).toEqual([
      { key: "a", name: "Squat", sub: "5 người chấm", value: 12, label: "12 lượt" },
      { key: "b", name: "Deadlift", sub: "3 người chấm", value: 3, label: "3 lượt" },
    ])
  })
})
