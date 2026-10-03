import type { BodyMetric } from "@/features/profile/types"

export type WeightPoint = { x: number; y: number; kg: number; measuredOn: string }

// ponytail: biểu đồ chỉ vẽ 12 lần đo gần nhất để nhãn ngày còn đọc được trên khung 390px;
// danh sách bên dưới vẫn đủ mọi lần. Cần xem xa hơn thì thêm chọn khoảng thời gian.
const MAX_POINTS = 12

/**
 * Điểm SVG cho đường cân nặng. Không thư viện biểu đồ (luật repo: không thêm dependency).
 * `metrics` là thứ tự API trả (mới nhất trước). Mức chênh = mới nhất − lần đầu trong khung,
 * code tính, làm tròn 1 số lẻ như cân nặng hiển thị.
 */
export function weightSeries(metrics: BodyMetric[], width: number, height: number, pad: number) {
  const data = metrics
    .filter((m): m is BodyMetric & { weightKg: number } => m.weightKg != null)
    .slice(0, MAX_POINTS)
    .reverse()
  if (data.length === 0) return { points: [] as WeightPoint[], path: "", delta: null as number | null }

  const kgs = data.map((m) => m.weightKg)
  const min = Math.min(...kgs)
  const range = Math.max(...kgs) - min
  const x = (i: number) => (data.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (data.length - 1))
  // Mọi lần bằng nhau (range 0) thì đặt giữa, không chia cho 0.
  const y = (kg: number) => (range === 0 ? height / 2 : height - pad - ((kg - min) / range) * (height - 2 * pad))

  const points = data.map((m, i) => ({ x: x(i), y: y(m.weightKg), kg: m.weightKg, measuredOn: m.measuredOn }))
  return {
    points,
    path: points.map((p, i) => `${i ? "L" : "M"}${round1(p.x)} ${round1(p.y)}`).join(" "),
    delta: data.length < 2 ? null : round1(kgs[kgs.length - 1] - kgs[0]),
  }
}

/** Chiều cao cột khối lượng theo tuần: cột cao nhất = maxPx. */
export function barHeights(values: number[], maxPx: number): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max === 0 ? 0 : (v / max) * maxPx))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}
