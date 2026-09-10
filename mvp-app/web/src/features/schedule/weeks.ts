import type { ScheduledWorkoutView } from "./types"

export type DayCell = {
  date: string // ISO yyyy-mm-dd
  weekday: number // 1=T2 … 7=CN, khớp restDays của backend
  isToday: boolean
  isRestDay: boolean
  workout: ScheduledWorkoutView | null
}

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const

/**
 * Lịch hiển thị theo TUẦN LỊCH (T2→CN), không theo "tuần thứ N kể từ ngày bắt
 * đầu": người dùng nhìn lịch của họ, không nhìn chỉ số tuần của chương trình.
 * weekIndex vẫn còn trong dữ liệu cho ai cần.
 *
 * Ngày không có buổi được phân biệt hai loại: NGÀY NGHỈ đã chọn, và ngày ngoài
 * phạm vi lịch đã sinh. Trộn hai cái thành ô trống là mất thông tin.
 */
export function toWeeks(
  workouts: ScheduledWorkoutView[],
  restDays: number[],
  today = new Date(),
): DayCell[][] {
  if (workouts.length === 0) return []

  const byDate = new Map(workouts.map((w) => [w.scheduledOn, w]))
  const dates = workouts.map((w) => w.scheduledOn).sort()
  const start = mondayOf(parseIso(dates[0]))
  const end = sundayOf(parseIso(dates[dates.length - 1]))
  const todayIso = toIso(today)

  const weeks: DayCell[][] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    const week: DayCell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(cursor, i)
      const iso = toIso(date)
      const weekday = isoWeekday(date)
      week.push({
        date: iso,
        weekday,
        isToday: iso === todayIso,
        isRestDay: restDays.includes(weekday),
        workout: byDate.get(iso) ?? null,
      })
    }
    weeks.push(week)
  }
  return weeks
}

/** Buổi kế tiếp cần tập: buổi PLANNED sớm nhất. Bỏ lỡ rồi thì vẫn tập được. */
export function nextWorkout(workouts: ScheduledWorkoutView[]): ScheduledWorkoutView | null {
  const pending = workouts
    .filter((w) => w.status === "PLANNED" || w.status === "MISSED")
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))
  return pending[0] ?? null
}

// Ngày giờ dùng Date có sẵn — §1.1 concept-frontend-v1.md: không thêm date-fns/dayjs.
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date: Date): string {
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
