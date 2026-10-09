import { describe, expect, it } from "vitest"
import type { AdminDashboard } from "@/features/admin/types"
import { completionRows, goalSlices, overallCompletion, rateColor } from "@/features/admin/utils/dashboard"

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
    const rows = completionRows([program("B", 1, 3, 3), program("C", 0, 0, 0), program("A", 2, 8, 2)])
    expect(rows.map((r) => [r.name, r.label])).toEqual([
      ["A", "80%"],
      ["B", "50%"],
      ["C", "—"],
    ])
    expect(rows[0].value).toBeCloseTo(0.8)
    expect(rows[2].value).toBe(0)
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
