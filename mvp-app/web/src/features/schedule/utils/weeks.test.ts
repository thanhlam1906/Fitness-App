import { describe, expect, it } from "vitest"
import { nextPlannedAfter, nextWorkout, programMonths, toMonth, weekProgress } from "./weeks"
import type { ScheduledWorkoutView } from "@/features/schedule/types"

function workout(scheduledOn: string, status: ScheduledWorkoutView["status"]): ScheduledWorkoutView {
  return { id: scheduledOn, scheduledOn, weekIndex: 1, label: "A", status, inProgress: false, exercises: [] }
}

describe("toMonth", () => {
  // Tháng 9/2026: ngày 1 là thứ Ba, ngày 30 là thứ Tư.
  const month = toMonth(2026, 8, [workout("2026-09-09", "DONE")], [6, 7], new Date(2026, 8, 26))

  it("lưới bắt đầu từ T2 của tuần chứa ngày 1, kết thúc CN của tuần chứa ngày cuối", () => {
    expect(month[0].date).toBe("2026-08-31")
    expect(month[month.length - 1].date).toBe("2026-10-04")
    expect(month).toHaveLength(35)
  })

  it("đánh dấu ngày thuộc tháng khác", () => {
    expect(month[0].inMonth).toBe(false)
    expect(month[1].inMonth).toBe(true)
  })

  it("gắn buổi tập, ngày nghỉ và hôm nay vào đúng ô", () => {
    const byDate = Object.fromEntries(month.map((d) => [d.date, d]))
    expect(byDate["2026-09-09"].workout?.status).toBe("DONE")
    expect(byDate["2026-09-12"].isRestDay).toBe(true) // thứ Bảy
    expect(byDate["2026-09-26"].isToday).toBe(true)
  })
})

describe("programMonths", () => {
  it("trải từ tháng buổi đầu tới tháng buổi cuối, kể cả khi vắt qua năm", () => {
    const months = programMonths([workout("2026-11-20", "PLANNED"), workout("2027-01-05", "PLANNED")])
    expect(months).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
    ])
  })

  it("không có buổi thì không có tháng", () => expect(programMonths([])).toEqual([]))
})

describe("nextPlannedAfter", () => {
  it("lấy buổi chưa tập gần nhất sau ngày đó, bỏ qua buổi đã xong", () => {
    const next = nextPlannedAfter(
      [workout("2026-09-29", "PLANNED"), workout("2026-09-27", "DONE"), workout("2026-10-01", "PLANNED")],
      "2026-09-26",
    )
    expect(next?.scheduledOn).toBe("2026-09-29")
  })

  it("hết buổi thì null", () => expect(nextPlannedAfter([workout("2026-09-01", "PLANNED")], "2026-09-26")).toBeNull())
})

describe("weekProgress", () => {
  it("đếm buổi của tuần lịch chứa hôm nay và số tuần của chương trình", () => {
    const workouts = [
      { ...workout("2026-09-22", "DONE"), weekIndex: 3 },
      { ...workout("2026-09-24", "DONE"), weekIndex: 3 },
      { ...workout("2026-09-26", "PLANNED"), weekIndex: 3 },
      { ...workout("2026-10-27", "PLANNED"), weekIndex: 8 },
    ]
    expect(weekProgress(workouts, "2026-09-07", new Date(2026, 8, 26))).toEqual({ weekIndex: 3, totalWeeks: 8, done: 2, total: 3 })
  })

  it("chương trình bắt đầu giữa tuần: tuần tính từ ngày bắt đầu, không theo T2", () => {
    const workouts = [{ ...workout("2026-09-30", "PLANNED"), weekIndex: 1 }, { ...workout("2026-10-14", "PLANNED"), weekIndex: 3 }]
    // Bắt đầu thứ Tư 30/9; thứ Năm 8/10 là ngày thứ 8 → tuần 2, dù tuần lịch còn chứa buổi tuần 1.
    expect(weekProgress(workouts, "2026-09-30", new Date(2026, 9, 8)).weekIndex).toBe(2)
  })

  it("chưa tới ngày bắt đầu hoặc đã qua tuần cuối thì không có số tuần", () => {
    const workouts = [{ ...workout("2026-09-09", "DONE"), weekIndex: 1 }]
    expect(weekProgress(workouts, "2026-10-01", new Date(2026, 8, 26)).weekIndex).toBeNull()
    expect(weekProgress(workouts, "2026-09-07", new Date(2026, 8, 26)).weekIndex).toBeNull()
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
