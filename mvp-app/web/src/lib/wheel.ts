// Hàm thuần cho cột cuộn của PickerField — tách khỏi component để test không cần DOM cuộn.

export function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/** Giá trị cũ có thể không nằm đúng bước cột (vd chiều cao 172,5 từ bản nhập tay): lấy ô gần nhất. */
export function nearestIndex(values: number[], v: number): number {
  let best = 0
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - v) < Math.abs(values[best] - v)) best = i
  }
  return best
}

/** Ô đang nằm giữa dải chọn, từ vị trí cuộn. Kẹp trong cột vì trình duyệt có thể cuộn quá đà. */
export function indexAtScroll(scrollTop: number, itemHeight: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(scrollTop / itemHeight)))
}

/** Cân nặng hai cột: phần nguyên và một số lẻ. Làm tròn tới 0,1 trước vì DB lưu được 2 số lẻ. */
export function splitTenths(v: number): [number, number] {
  const tenths = Math.round(v * 10)
  return [Math.floor(tenths / 10), tenths % 10]
}

/** Ghép qua số nguyên để 65 + 0,3 không thành 65.30000000000001. */
export function joinTenths(whole: number, tenth: number): number {
  return (whole * 10 + tenth) / 10
}
