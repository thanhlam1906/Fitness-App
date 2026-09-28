import type { CheckResult, Evidence } from "./types"

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
