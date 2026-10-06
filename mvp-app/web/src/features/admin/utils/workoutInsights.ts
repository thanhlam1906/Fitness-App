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
