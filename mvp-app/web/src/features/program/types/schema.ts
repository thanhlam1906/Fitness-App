// 1=Thu 2 ... 7=Chu nhat -- khop DayOfWeek.getValue() ben backend (V1__init.sql).
export const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" },
] as const

// Giãn đều để có ngày nghỉ xen giữa các buổi, nhất là buổi tạ nặng.
const SPREAD: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
}

/** Ngày tập mặc định khi chọn template: số buổi đã khai, kẹp vào khoảng template cho phép. */
export function defaultTrainingDays(
  template: { sessionsMin: number; sessionsMax: number },
  profileSessions: number | null | undefined,
): number[] {
  const wanted = profileSessions ?? template.sessionsMin
  const sessions = Math.min(Math.max(wanted, template.sessionsMin), template.sessionsMax)
  return SPREAD[Math.min(Math.max(sessions, 1), 7)]
}
