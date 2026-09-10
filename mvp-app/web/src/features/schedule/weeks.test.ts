import { describe, expect, it } from "vitest"
import { nextWorkout, toWeeks } from "./weeks"
import type { ScheduledWorkoutView } from "./types"

function workout(scheduledOn: string, status: ScheduledWorkoutView["status"]): ScheduledWorkoutView {
  return { id: scheduledOn, scheduledOn, weekIndex: 1, label: "A", status, exercises: [] }
}

describe("toWeeks", () => {
  it("mỗi tuần luôn đúng 7 ô, bắt đầu từ T2", () => {
    // 2026-09-09 là thứ Tư.
    const weeks = toWeeks([workout("2026-09-09", "PLANNED")], [6, 7], new Date(2026, 8, 9))
    expect(weeks).toHaveLength(1)
    expect(weeks[0]).toHaveLength(7)
    expect(weeks[0][0].date).toBe("2026-09-07") // thứ Hai cùng tuần
    expect(weeks[0][0].weekday).toBe(1)
    expect(weeks[0][6].weekday).toBe(7)
  })

  it("phân biệt ngày nghỉ đã chọn với ngày không có buổi", () => {
    const weeks = toWeeks([workout("2026-09-09", "PLANNED")], [6, 7], new Date(2026, 8, 9))
    const saturday = weeks[0].find((d) => d.weekday === 6)!
    const monday = weeks[0].find((d) => d.weekday === 1)!

    expect(saturday.isRestDay).toBe(true)
    expect(monday.isRestDay).toBe(false)
    expect(monday.workout).toBeNull() // không có buổi, nhưng cũng không phải ngày nghỉ
  })

  it("trải đủ các tuần từ buổi đầu tới buổi cuối", () => {
    const weeks = toWeeks(
      [workout("2026-09-09", "DONE"), workout("2026-09-23", "PLANNED")],
      [],
      new Date(2026, 8, 9),
    )
    expect(weeks).toHaveLength(3)
  })

  it("đánh dấu hôm nay", () => {
    const weeks = toWeeks([workout("2026-09-09", "PLANNED")], [], new Date(2026, 8, 10))
    expect(weeks[0].filter((d) => d.isToday).map((d) => d.date)).toEqual(["2026-09-10"])
  })

  it("không có buổi nào thì không vẽ tuần nào", () => {
    expect(toWeeks([], [6, 7])).toEqual([])
  })
})

describe("nextWorkout", () => {
  it("lấy buổi chưa tập sớm nhất, bỏ qua buổi đã xong", () => {
    const next = nextWorkout([
      workout("2026-09-11", "PLANNED"),
      workout("2026-09-09", "DONE"),
      workout("2026-09-10", "PLANNED"),
    ])
    expect(next?.scheduledOn).toBe("2026-09-10")
  })

  it("buổi bỏ lỡ vẫn tập được, không bị loại", () => {
    const next = nextWorkout([workout("2026-09-01", "MISSED"), workout("2026-09-10", "PLANNED")])
    expect(next?.scheduledOn).toBe("2026-09-01")
  })

  it("tập xong hết thì không còn buổi kế tiếp", () => {
    expect(nextWorkout([workout("2026-09-09", "DONE")])).toBeNull()
  })
})
