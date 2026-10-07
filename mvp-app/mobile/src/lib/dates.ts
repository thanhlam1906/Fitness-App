// Ngày bắt đầu chương trình chọn bằng khung cuộn (web dùng ô chọn ngày của trình duyệt, RN không có).

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

function dayAt(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "yyyy-mm-dd" theo giờ máy — không dùng toISOString (giờ UTC, 0–7h sáng ở VN lệch một ngày). */
export function isoDay(offset: number): string {
  const d = dayAt(offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Nhãn ô trong khung cuộn: "Hôm nay", "Ngày mai", rồi "T5 03/10". */
export function startLabel(offset: number): string {
  if (offset === 0) return "Hôm nay"
  if (offset === 1) return "Ngày mai"
  const d = dayAt(offset)
  return `${WEEKDAY_SHORT[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

/** 4 tuần tới. */
export const START_OFFSETS = Array.from({ length: 28 }, (_, i) => i)
