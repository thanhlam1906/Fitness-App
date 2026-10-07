import type { WorkoutInsights } from "@/features/admin/types"
import { BODY_AREAS, SKIP_REASONS } from "@/features/workout/types"

export const INSIGHT_DAYS = [7, 30, 90] as const
export type InsightDays = (typeof INSIGHT_DAYS)[number]
export type InsightsFilter = { templateId: string | null; days: InsightDays }

/** Bộ lọc nằm trong query string để tải lại trang vẫn giữ. Giá trị lạ quay về mặc định. */
export function readInsightsFilter(params: URLSearchParams): InsightsFilter {
  const days = Number(params.get("days"))
  return {
    templateId: params.get("template") || null,
    days: INSIGHT_DAYS.find((d) => d === days) ?? 30,
  }
}

export function writeInsightsFilter(filter: InsightsFilter): URLSearchParams {
  const params = new URLSearchParams({ days: String(filter.days) })
  if (filter.templateId) params.set("template", filter.templateId)
  return params
}

/** Mã quy tắc trong load_decisions.rule_id. Quy tắc mới chưa có nhãn thì hiện nguyên mã. */
const RULE_LABELS: Record<string, string> = {
  PAIN_REPORTED: "Báo đau",
  PAIN_REPEATED: "Đau lặp lại",
  LOW_COMPLETION_RATE: "Hoàn thành ít set",
  SETS_MISSED_TARGET: "Nhiều set hụt rep",
  REPEATED_REP_FAILURE: "Hụt rep liên tiếp",
  RPE_ABOVE_TARGET: "RPE quá cao",
  RPE_BELOW_TARGET_STREAK: "RPE thấp liên tiếp",
  DOUBLE_PROGRESSION_ALL_REPS_MET: "Đủ rep mọi set",
}

export function ruleLabel(ruleId: string | null): string {
  if (!ruleId) return "—"
  return RULE_LABELS[ruleId] ?? ruleId
}

export function skipReasonLabel(code: string | null): string {
  if (!code) return "—"
  return SKIP_REASONS.find((r) => r.value === code)?.label ?? code
}

export function bodyAreaLabel(code: string): string {
  return BODY_AREAS.find((a) => a.value === code)?.label ?? code
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? "—" : `${Math.round((part * 100) / whole)}%`
}

export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const

export type Slice = { key: string; label: string; value: number; color: string; detail?: string }

/**
 * Cung của vòng donut theo tỉ lệ: độ dài nét và điểm bắt đầu trên chu vi. Chừa khe `gap` giữa các phần
 * để màu nền tách chúng (không vẽ viền). Phần 0 có độ dài 0 để component bỏ qua.
 */
export function donutArcs(values: number[], circumference: number, gap = 2): { length: number; offset: number }[] {
  const total = values.reduce((a, v) => a + v, 0)
  let start = 0
  return values.map((v) => {
    const full = total === 0 ? 0 : (v / total) * circumference
    const arc = { length: v === 0 ? 0 : Math.max(full - gap, 0.5), offset: start }
    start += full
    return arc
  })
}

/**
 * Top 5 vùng đau + "Khác" cho số lần còn lại, để vòng tròn cộng đủ tổng số lần báo đau.
 * ponytail: màu theo hạng vì có 10 vùng mà chỉ 5 màu; đổi bộ lọc có thể đổi màu một vùng, chú thích luôn ghi tên.
 */
export function painSlices(pain: WorkoutInsights["pain"], totalReports: number): Slice[] {
  const slices: Slice[] = pain.map((p, i) => ({
    key: p.bodyArea,
    label: bodyAreaLabel(p.bodyArea),
    value: p.reports,
    color: CHART_COLORS[i % CHART_COLORS.length],
    detail: `${p.users} người · mức TB ${p.avgSeverity.toFixed(1)}${p.topExerciseName ? ` · hay có ${p.topExerciseName}` : ""}`,
  }))
  const rest = totalReports - pain.reduce((a, p) => a + p.reports, 0)
  if (rest > 0) slices.push({ key: "OTHER", label: "Khác", value: rest, color: "var(--color-chart-neutral)" })
  return slices
}

/** Lý do bỏ set: backend trả thứ tự cố định nên màu gắn theo lý do, không theo hạng. */
export function skipReasonSlices(reasons: WorkoutInsights["summary"]["skipReasons"]): Slice[] {
  return reasons.map((r, i) => ({
    key: r.key,
    label: skipReasonLabel(r.key),
    value: r.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))
}

/** Lý do có nhiều set bị bỏ nhất; null khi chưa set nào bị bỏ. */
export function topSkipReason(reasons: WorkoutInsights["summary"]["skipReasons"]): string | null {
  const top = reasons.reduce<{ key: string; count: number } | null>(
    (best, r) => (r.count > (best?.count ?? 0) ? r : best),
    null,
  )
  return top ? skipReasonLabel(top.key) : null
}
