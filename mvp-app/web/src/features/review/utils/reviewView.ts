import type { CheckResult, Evidence } from "@/features/review/types"
import { MEASURES, MOMENT_NAME, rangeText, type MeasureKey, type Moment, type ViewCode } from "@/lib/formMeasures"

/** Mục do LLM chấm có tên tiếng Việt; kết quả rule cũ (trước V11) chỉ có code. */
export function checkLabel(c: CheckResult): string {
  return c.name ?? c.code ?? "—"
}

export function isOverallOk(checks: CheckResult[]): boolean {
  return !checks.some((c) => c.verdict === "FAIL" || c.verdict === "WARN")
}

/** `measured` là jsonb thô. Mục do LLM chấm có {"evidence": [...]}; kết quả rule cũ thì không. */
export function evidenceOf(c: CheckResult): Evidence[] {
  if (!c.measured) return []
  try {
    const parsed = JSON.parse(c.measured) as { evidence?: unknown }
    return Array.isArray(parsed.evidence) ? (parsed.evidence as Evidence[]) : []
  } catch {
    return []
  }
}

export function evidenceLine(e: Evidence): string {
  return `Rep ${e.rep} · góc ${e.view_vi} · ${e.label_vi} ${e.value}${e.unit ?? ""}`
}

/** `measured` của mục chấm theo ngưỡng admin nhập (doc/design-cham-form-nguong-v1.md §6). */
export type Graded = {
  view: ViewCode
  measure: MeasureKey
  moment: Moment
  from: number | null
  to: number | null
  warn: number
  values: { rep: number; value: number }[]
  worst: { rep: number; value: number }
}

/** null khi mục không có số từng rep: LOW_CONFIDENCE, NOT_APPLICABLE, kết quả cũ, jsonb hỏng. */
export function gradedOf(c: CheckResult): Graded | null {
  if (!c.measured) return null
  try {
    const m = JSON.parse(c.measured) as Partial<Graded>
    return Array.isArray(m.values) && m.worst && m.measure && m.measure in MEASURES ? (m as Graded) : null
  } catch {
    return null
  }
}

/** "Góc gối lúc sâu nhất: 105° ở rep 5 (cần không quá 100°)" rồi "Từng rep: 88° · 93° · …". */
export function gradedLines(g: Graded): string[] {
  const label = `${MEASURES[g.measure].label} ${MOMENT_NAME[g.moment].toLowerCase()}`
  return [
    `${label}: ${g.worst.value}° ở rep ${g.worst.rep} (cần ${rangeText(g)})`,
    `Từng rep: ${g.values.map((v) => `${v.value}°`).join(" · ")}`,
  ]
}

/** Mọi dòng số dưới một mục: kiểu ngưỡng mới, hoặc dẫn chứng của kết quả cũ do LLM chấm. */
export function checkDetails(c: CheckResult): string[] {
  const graded = gradedOf(c)
  return graded ? gradedLines(graded) : evidenceOf(c).map(evidenceLine)
}
