import type { AdminDashboard, TimelinePoint } from "@/features/admin/types"
import type { BarRow } from "@/features/admin/components/InsightRows"
import { percent, type Slice } from "@/features/admin/utils/workoutInsights"
import { GOALS } from "@/features/profile/types"

const GOAL_COLORS: Record<string, string> = {
  MUSCLE: "var(--color-chart-1)",
  FAT_LOSS: "var(--color-chart-2)",
  STRENGTH: "var(--color-chart-3)",
  GENERAL: "var(--color-chart-4)",
  NONE: "var(--color-chart-neutral)",
}

/** Mục tiêu đông nhất lên đầu để đọc hạng ngay; "Chưa chọn" luôn cuối vì không phải một mục tiêu. */
export function goalSlices(goals: AdminDashboard["goals"]): Slice[] {
  return goals
    .map((g) => ({
      key: g.goal,
      label: GOALS.find((o) => o.value === g.goal)?.label ?? "Chưa chọn",
      value: g.users,
      color: GOAL_COLORS[g.goal] ?? GOAL_COLORS.NONE,
    }))
    .sort((a, b) => Number(a.key === "NONE") - Number(b.key === "NONE") || b.value - a.value)
}

/** Từ 80% xanh, từ 60% vàng, dưới đó đỏ. Mốc do người dùng duyệt theo mockup 10-07. */
export function rateColor(rate: number): string {
  if (rate >= 0.8) return "var(--color-success)"
  if (rate >= 0.6) return "var(--color-warn)"
  return "var(--color-danger)"
}

type Program = AdminDashboard["programs"][number]

/** Thẻ Hoàn thành thu gọn hiện chừng này chương trình; người dùng chốt 10-09 (100 template thì thẻ dài vô tận). */
export const COMPLETION_TOP = 5

/** Chương trình có ít nhất một buổi (đã tập hoặc lỡ) trong khoảng; không có buổi thì tỉ lệ không nói gì. */
export function programsWithSessions(programs: Program[]): Program[] {
  return programs.filter((p) => p.done + p.missed > 0)
}

/**
 * Tỉ lệ hoàn thành = buổi đã tập / (đã tập + lỡ), cùng cách tính với trang Buổi tập. Có `limit` thì lấy
 * `limit` chương trình nhiều buổi nhất rồi mới xếp theo tỉ lệ, để chương trình một người lỡ ba buổi
 * không chiếm chỗ chương trình bốn mươi người.
 */
export function completionRows(programs: Program[], limit = Infinity): BarRow[] {
  return programsWithSessions(programs)
    .sort((a, b) => b.done + b.missed - (a.done + a.missed))
    .slice(0, limit)
    .map((p) => ({ p, rate: p.done / (p.done + p.missed) }))
    .sort((a, b) => b.rate - a.rate || b.p.done - a.p.done)
    .map(({ p, rate }) => ({
      key: p.templateId ?? "custom",
      name: p.name,
      sub: `${p.users} người · ${p.done} buổi · ${p.missed} lỡ`,
      value: rate,
      label: percent(p.done, p.done + p.missed),
      color: rateColor(rate),
    }))
}

/** Cộng buổi của mọi chương trình rồi mới chia, để chương trình ít buổi không kéo lệch. */
export function overallCompletion(programs: Program[]): string {
  const done = programs.reduce((a, p) => a + p.done, 0)
  const missed = programs.reduce((a, p) => a + p.missed, 0)
  return percent(done, done + missed)
}

/** Cắt chuỗi "yyyy-mm-dd" chứ không qua Date: Date đọc chuỗi đó theo UTC, máy lệch múi sẽ lùi một ngày. */
export function pointLabel(start: string, unit: AdminDashboard["timelineUnit"]): { short: string; long: string } {
  const [, m, d] = start.split("-").map(Number)
  const short = `${d}/${m}`
  return { short, long: unit === "WEEK" ? `Tuần từ ${short}` : short }
}

export function wrongTotal(p: TimelinePoint): number {
  return p.wrongForm + p.wrongLoad + p.wrongAssistant
}

/**
 * Toạ độ các điểm của biểu đồ đường trong khung width × height: x rải đều, số lớn nhất chạm lề trên `pad`,
 * số 0 nằm ở lề dưới. Một điểm duy nhất đặt giữa khung.
 */
export function lineCoords(values: number[], width: number, height: number, pad: number): { x: number; y: number }[] {
  const max = Math.max(...values)
  return values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: height - pad - (max === 0 ? 0 : (v / max) * (height - 2 * pad)),
  }))
}

export function formCheckRows(top: AdminDashboard["topFormChecks"]): BarRow[] {
  return top.map((c) => ({
    key: c.exerciseId,
    name: c.name,
    sub: `${c.users} người chấm`,
    value: c.checks,
    label: `${c.checks} lượt`,
  }))
}
