/**
 * Bảng số đo admin chọn khi khai báo khớp cần kiểm (doc/design-cham-form-nguong-v1.md §3). Khoá
 * trùng analyzer `feature_keys.py` và backend `FormMeasures.java`: thêm khoá thì thêm cả ba. Dùng
 * ở trang admin và màn kết quả (web, mobile import thẳng file này).
 */
export type ViewCode = "SAGITTAL" | "FRONTAL" | "DIAGONAL"
export type Moment = "START" | "PEAK"
export type MeasureKey =
  | "ankle"
  | "knee"
  | "hip"
  | "shoulder"
  | "elbow"
  | "torso"
  | "line"
  | "valgus"
  | "asym_knee"
  | "asym_hip"
  | "asym_shoulder"

export type Measure = {
  /** Tên trên nút chọn ở trang admin. */
  name: string
  /** Tên trong câu ở màn kết quả: "Góc gối lúc sâu nhất: 105°". */
  label: string
  /** Một dòng mốc để admin biết con số nghĩa là gì. */
  ref: string
  max: number
  views: ViewCode[]
}

// Nhìn chính diện thì khớp gập về phía camera nên góc gập bị méo; nhìn ngang thì hai bên chồng
// nhau nên không so được trái – phải. Góc chéo thấy một phần cả hai.
const SIDE: ViewCode[] = ["SAGITTAL", "DIAGONAL"]
const FRONT: ViewCode[] = ["FRONTAL", "DIAGONAL"]

export const MEASURES: Record<MeasureKey, Measure> = {
  ankle: { name: "Cổ chân", label: "Góc cổ chân", ref: "90° = cẳng chân dựng đứng", max: 180, views: SIDE },
  knee: { name: "Gối", label: "Góc gối", ref: "180° = duỗi thẳng · 90° = vuông góc", max: 180, views: SIDE },
  hip: { name: "Hông", label: "Góc hông", ref: "180° = đứng thẳng", max: 180, views: SIDE },
  shoulder: {
    name: "Vai",
    label: "Góc vai",
    ref: "0° = tay sát thân · 180° = tay qua đầu",
    max: 180,
    views: ["SAGITTAL", "FRONTAL", "DIAGONAL"],
  },
  elbow: { name: "Khuỷu", label: "Góc khuỷu", ref: "180° = duỗi thẳng · 90° = vuông góc", max: 180, views: SIDE },
  torso: { name: "Thân nghiêng", label: "Thân nghiêng", ref: "0° = thân dựng đứng · 90° = nằm ngang", max: 90, views: SIDE },
  line: {
    name: "Thân thẳng",
    label: "Đường vai – hông – cổ chân",
    ref: "Đường vai – hông – cổ chân. 180° = thẳng một đường",
    max: 180,
    views: SIDE,
  },
  valgus: { name: "Gối chụm", label: "Gối chụm", ref: "Gối lệch vào trong. 0° = gối thẳng hàng", max: 40, views: FRONT },
  asym_knee: { name: "Lệch 2 gối", label: "Lệch 2 gối", ref: "Gối trái và phải chênh nhau. 0° = như nhau", max: 45, views: FRONT },
  asym_hip: { name: "Lệch 2 hông", label: "Lệch 2 hông", ref: "Hông trái và phải chênh nhau. 0° = như nhau", max: 45, views: FRONT },
  asym_shoulder: { name: "Lệch 2 vai", label: "Lệch 2 vai", ref: "Vai trái và phải chênh nhau. 0° = như nhau", max: 45, views: FRONT },
}

export const VIEW_ORDER: ViewCode[] = ["SAGITTAL", "FRONTAL", "DIAGONAL"]
export const VIEW_NAME: Record<ViewCode, string> = { SAGITTAL: "Ngang", FRONTAL: "Chính diện", DIAGONAL: "Chéo 45°" }
export const MOMENT_NAME: Record<Moment, string> = { START: "Lúc bắt đầu", PEAK: "Lúc sâu nhất" }

export function measuresFor(view: ViewCode): MeasureKey[] {
  return (Object.keys(MEASURES) as MeasureKey[]).filter((k) => MEASURES[k].views.includes(view))
}

export type Range = { from: number | null; to: number | null; warn: number }

/** Vùng xanh (đạt) và vàng (sát ngưỡng) trên thang 0..max; phần còn lại là đỏ. */
export function zones(r: Range, max: number): { pass: [number, number]; warn: [number, number][] } {
  const clamp = (v: number) => Math.max(0, Math.min(max, v))
  const lo = r.from ?? 0
  const hi = r.to ?? max
  const warn: [number, number][] = []
  if (r.warn > 0 && r.from !== null) warn.push([clamp(lo - r.warn), lo])
  if (r.warn > 0 && r.to !== null) warn.push([hi, clamp(hi + r.warn)])
  return { pass: [lo, hi], warn }
}

/** "từ 80° đến 110°", "không quá 100°", "ít nhất 165°" — câu trên màn kết quả. */
export function rangeText(r: Pick<Range, "from" | "to">): string {
  if (r.from !== null && r.to !== null) return `từ ${r.from}° đến ${r.to}°`
  return r.to !== null ? `không quá ${r.to}°` : `ít nhất ${r.from}°`
}

/** "80–110°", "≤ 100°", "≥ 165°" — dòng tóm tắt ở danh sách khớp của admin. */
export function shortRule(r: Pick<Range, "from" | "to">): string {
  if (r.from !== null && r.to !== null) return `${r.from}–${r.to}°`
  return r.to !== null ? `≤ ${r.to}°` : `≥ ${r.from}°`
}
