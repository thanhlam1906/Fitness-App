import { formatKg } from "@/lib/format"
import type { ScheduledExerciseView, ScheduledWorkoutView } from "./types"
import { parseIso, toIso, WEEKDAY_LABELS } from "./weeks"

/** Một loại buổi của màn Chương trình (doc/design-chuong-trinh-v1.md §3). */
export type ProgramDay = {
  label: string
  /** Buổi mở sớm nhất; null = nhãn này đã tập hết. */
  next: ScheduledWorkoutView | null
  /** Số buổi PLANNED từ hôm nay: số buổi mà "Sửa" sẽ áp vào. */
  remaining: number
  /** Của buổi tới, hoặc buổi gần nhất khi đã tập hết. */
  exercises: ScheduledExerciseView[]
}

/** Cùng luật "buổi mở" của backend (spec §4): buổi đang tập dở giữ nguyên, không sửa, không dời. */
const isOpen = (todayIso: string) => (w: ScheduledWorkoutView) =>
  w.status === "PLANNED" && w.scheduledOn >= todayIso && !w.inProgress

const byDate = (a: ScheduledWorkoutView, b: ScheduledWorkoutView) => a.scheduledOn.localeCompare(b.scheduledOn)

/** Nhóm lịch theo nhãn, theo thứ tự nhãn xuất hiện lần đầu — chính là thứ tự chu kỳ. */
export function programDays(workouts: ScheduledWorkoutView[], todayIso: string): ProgramDay[] {
  const sorted = [...workouts].sort(byDate)
  const labels = [...new Set(sorted.map((w) => w.label ?? ""))]
  return labels.map((label) => {
    const mine = sorted.filter((w) => (w.label ?? "") === label)
    const open = mine.filter(isOpen(todayIso))
    const next = open[0] ?? null
    return { label, next, remaining: open.length, exercises: (next ?? mine[mine.length - 1]).exercises }
  })
}

/** "4×6–8 · 32,5 kg" — mục tiêu một bài, cùng cách viết với thẻ ngày ở màn Lịch. */
export function formatTarget(
  ex: Pick<ScheduledExerciseView, "targetSets" | "targetReps" | "targetRepsMax" | "targetLoadKg">,
): string {
  const reps = ex.targetRepsMax > ex.targetReps ? `${ex.targetReps}–${ex.targetRepsMax}` : `${ex.targetReps}`
  return `${ex.targetSets}×${reps}${ex.targetLoadKg === null ? "" : ` · ${formatKg(ex.targetLoadKg)}`}`
}

/** 1=T2 … 7=CN, khớp restDays của backend. */
const weekday = (d: Date) => ((d.getDay() + 6) % 7) + 1

/** "T2 28/9" */
export function shortDayTitle(iso: string): string {
  const d = parseIso(iso)
  return `${WEEKDAY_LABELS[weekday(d) - 1]} ${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * Xem trước khi đổi ngày tập — cùng luật backend (spec §4.2): từ hôm nay (hoặc ngày bắt đầu
 * nếu chưa tới), đúng thứ đã chọn, bỏ qua ngày đã có buổi không dời được.
 */
export function previewDates(
  workouts: ScheduledWorkoutView[],
  trainingDays: number[],
  todayIso: string,
  startDate: string,
  count: number,
): { date: string; label: string }[] {
  if (trainingDays.length === 0) return []
  const open = workouts.filter(isOpen(todayIso)).sort(byDate)
  const taken = new Set(
    workouts.filter((w) => w.scheduledOn >= todayIso && !open.includes(w)).map((w) => w.scheduledOn),
  )
  const cursor = parseIso(todayIso > startDate ? todayIso : startDate)
  return open.slice(0, count).map((w) => {
    while (!trainingDays.includes(weekday(cursor)) || taken.has(toIso(cursor))) {
      cursor.setDate(cursor.getDate() + 1)
    }
    const date = toIso(cursor)
    cursor.setDate(cursor.getDate() + 1)
    return { date, label: w.label ?? "" }
  })
}
