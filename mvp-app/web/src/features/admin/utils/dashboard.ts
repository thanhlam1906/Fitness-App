import type { AdminDashboard } from "@/features/admin/types"
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

/** Tỉ lệ hoàn thành = buổi đã tập / (đã tập + lỡ), cùng cách tính với trang Buổi tập. */
export function completionRows(programs: Program[]): BarRow[] {
  return programs
    .map((p) => ({ p, rate: p.done + p.missed === 0 ? null : p.done / (p.done + p.missed) }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.p.done - a.p.done)
    .map(({ p, rate }) => ({
      key: p.templateId ?? "custom",
      name: p.name,
      sub: `${p.users} người · ${p.done} buổi · ${p.missed} lỡ`,
      value: rate ?? 0,
      label: rate === null ? "—" : percent(p.done, p.done + p.missed),
      color: rate === null ? undefined : rateColor(rate),
    }))
}

/** Cộng buổi của mọi chương trình rồi mới chia, để chương trình ít buổi không kéo lệch. */
export function overallCompletion(programs: Program[]): string {
  const done = programs.reduce((a, p) => a + p.done, 0)
  const missed = programs.reduce((a, p) => a + p.missed, 0)
  return percent(done, done + missed)
}
