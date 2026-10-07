import type { ScheduledWorkoutView } from "@/features/schedule/types"

export type DayCell = {
  date: string // ISO yyyy-mm-dd
  weekday: number // 1=T2 … 7=CN, khớp restDays của backend
  isToday: boolean
  isRestDay: boolean
  workout: ScheduledWorkoutView | null
}

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const

const WEEKDAY_NAMES = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"]

/** "Thứ năm 24/9" — tiêu đề thẻ ngày và nhãn đọc màn hình của ô lịch. */
export function dayTitle(iso: string): string {
  const d = parseIso(iso)
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

export type MonthCell = DayCell & { inMonth: boolean }

/**
 * Lưới một tháng cho màn Lịch (doc/design-ui-m3-v1.md §2): từ T2 của tuần chứa
 * ngày 1 tới CN của tuần chứa ngày cuối, để hàng nào cũng đủ 7 ô. `month` đếm từ 0
 * như Date.
 *
 * Ngày không có buổi được phân biệt hai loại: NGÀY NGHỈ đã chọn, và ngày ngoài
 * phạm vi lịch đã sinh. Trộn hai cái thành ô trống là mất thông tin.
 */
export function toMonth(
  year: number,
  month: number,
  workouts: ScheduledWorkoutView[],
  restDays: number[],
  today = new Date(),
): MonthCell[] {
  const byDate = new Map(workouts.map((w) => [w.scheduledOn, w]))
  const todayIso = toIso(today)
  const end = sundayOf(new Date(year, month + 1, 0))
  const cells: MonthCell[] = []
  for (let date = mondayOf(new Date(year, month, 1)); date <= end; date = addDays(date, 1)) {
    const iso = toIso(date)
    const weekday = isoWeekday(date)
    cells.push({
      date: iso,
      weekday,
      isToday: iso === todayIso,
      isRestDay: restDays.includes(weekday),
      workout: byDate.get(iso) ?? null,
      inMonth: date.getMonth() === month,
    })
  }
  return cells
}

/** Các tháng có buổi của chương trình: nút ‹ › của màn Lịch chỉ lật trong khoảng này. */
export function programMonths(workouts: ScheduledWorkoutView[]): { year: number; month: number }[] {
  if (workouts.length === 0) return []
  const dates = workouts.map((w) => w.scheduledOn).sort()
  const first = parseIso(dates[0])
  const last = parseIso(dates[dates.length - 1])
  const months = []
  for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= last; d.setMonth(d.getMonth() + 1)) {
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return months
}

/** Thẻ ngày nghỉ báo "Buổi tới": buổi chưa tập gần nhất SAU ngày đang xem. */
export function nextPlannedAfter(
  workouts: ScheduledWorkoutView[],
  iso: string,
): ScheduledWorkoutView | null {
  const later = workouts
    .filter((w) => w.status === "PLANNED" && w.scheduledOn > iso)
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))
  return later[0] ?? null
}

/**
 * Dòng đầu màn Lịch: "Tuần 3 / 8" theo chương trình, "2/3 buổi" theo tuần LỊCH
 * chứa hôm nay — người dùng nghĩ "tuần này", không nghĩ chỉ số tuần.
 *
 * Số tuần tính từ startDate như backend (ngày thứ n / 7 + 1): lịch tự thiết kế bắt
 * đầu ngày nào cũng được, nên tuần chương trình không trùng tuần lịch T2–CN.
 */
export function weekProgress(workouts: ScheduledWorkoutView[], startDate: string, today = new Date()) {
  const from = toIso(mondayOf(today))
  const to = toIso(sundayOf(today))
  const thisWeek = workouts.filter((w) => w.scheduledOn >= from && w.scheduledOn <= to)
  const totalWeeks = Math.max(0, ...workouts.map((w) => w.weekIndex))
  const days = Math.round((parseIso(toIso(today)).getTime() - parseIso(startDate).getTime()) / 86_400_000)
  const index = Math.floor(days / 7) + 1
  return {
    weekIndex: days < 0 || index > totalWeeks ? null : index,
    totalWeeks,
    done: thisWeek.filter((w) => w.status === "DONE").length,
    total: thisWeek.length,
  }
}

/** Buổi kế tiếp cần tập: buổi PLANNED sớm nhất. Bỏ lỡ rồi thì vẫn tập được. */
export function nextWorkout(workouts: ScheduledWorkoutView[]): ScheduledWorkoutView | null {
  const pending = workouts
    .filter((w) => w.status === "PLANNED" || w.status === "MISSED")
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))
  return pending[0] ?? null
}

// Ngày giờ dùng Date có sẵn — §1.1 concept-frontend-v1.md: không thêm date-fns/dayjs.
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function toIso(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay()
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function mondayOf(date: Date): Date {
  return addDays(date, 1 - isoWeekday(date))
}

function sundayOf(date: Date): Date {
  return addDays(date, 7 - isoWeekday(date))
}
