import { MEASURES, type MeasureKey, type Moment, type Range, type ViewCode } from "@/lib/formMeasures"
import type { FormCheck, FormCheckInput } from "@/features/exercise/types"

/** Ô nhập giữ chữ thô để gõ dở ("1", "") không bị ép thành số. */
export type Draft = {
  view: ViewCode
  measure: MeasureKey | null
  moment: Moment
  from: string
  to: string
  warn: string
  nameVi: string
  cueFailVi: string
}

export type DraftErrors = { measure?: string; range?: string; nameVi?: string; cueFailVi?: string }

export function emptyDraft(view: ViewCode): Draft {
  // Đa số lỗi kỹ thuật lộ ra ở điểm sâu nhất của động tác, nên chọn sẵn.
  return { view, measure: null, moment: "PEAK", from: "", to: "", warn: "", nameVi: "", cueFailVi: "" }
}

export function draftOf(c: FormCheck): Draft {
  const text = (v: number | null) => (v === null ? "" : String(v))
  return {
    view: c.view,
    measure: c.measure,
    moment: c.moment,
    from: text(c.from),
    to: text(c.to),
    warn: String(c.warn),
    nameVi: c.nameVi,
    cueFailVi: c.cueFailVi,
  }
}

// Bàn phím tiếng Việt gõ dấu phẩy thập phân; đổi để Number() hiểu, rồi mới bắt lỗi số lẻ.
const num = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")))

export function validateDraft(d: Draft): DraftErrors {
  const e: DraftErrors = {}
  if (!d.measure) {
    e.measure = "Chọn một khớp."
  } else {
    const max = MEASURES[d.measure].max
    const from = num(d.from)
    const to = num(d.to)
    const warn = num(d.warn) ?? 0
    const bad = (v: number | null) => v !== null && (!Number.isInteger(v) || v < 0 || v > max)
    if (from === null && to === null) e.range = "Nhập ít nhất một số."
    else if (bad(from) || bad(to)) e.range = `Nhập số nguyên từ 0 đến ${max}.`
    else if (from !== null && to !== null && from >= to) e.range = "Số đầu phải nhỏ hơn số sau."
    else if (!Number.isInteger(warn) || warn < 0) e.range = "Sát ngưỡng phải là số nguyên từ 0 trở lên."
  }
  if (!d.nameVi.trim()) e.nameVi = "Cần tên mục."
  if (!d.cueFailVi.trim()) e.cueFailVi = "Cần câu nhắc khi sai."
  return e
}

/** Khoảng cho thanh màu; null khi chưa chọn khớp hoặc số chưa hợp lệ. */
export function rangeOf(d: Draft): Range | null {
  if (!d.measure || validateDraft(d).range) return null
  return { from: num(d.from), to: num(d.to), warn: num(d.warn) ?? 0 }
}

/** Chỉ gọi khi validateDraft không còn lỗi. */
export function toInput(d: Draft): FormCheckInput {
  return {
    view: d.view,
    measure: d.measure!,
    moment: d.moment,
    from: num(d.from),
    to: num(d.to),
    warn: num(d.warn) ?? 0,
    nameVi: d.nameVi.trim(),
    cueFailVi: d.cueFailVi.trim(),
  }
}
