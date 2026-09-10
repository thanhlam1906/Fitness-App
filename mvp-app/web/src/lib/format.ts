/** Số kiểu Việt Nam: phẩy thập phân, chấm hàng nghìn — design "Fitness MVP" dùng "2,5 kg". */
const KG = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })

/** Hiển thị số kg: bỏ ,0 thừa, giữ 1 số lẻ khi có (vd tạ đơn 2,5kg mỗi bên). */
export function formatKg(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—"
  return `${KG.format(kg)} kg`
}

/** Số nguyên có phân cách hàng nghìn — tổng tải trên màn kết buổi. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value)
}

/** Ngày kiểu Việt Nam từ ISO instant hoặc ISO date. Dùng Intl có sẵn — §1.1: không thêm date-fns. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN")
}

/** "sửa 14:02" nếu là hôm nay, "sửa 12 thg 9" nếu khác ngày — dòng phụ ở màn 12. */
export function formatEditedAt(iso: string): string {
  const at = new Date(iso)
  const sameDay = at.toDateString() === new Date().toDateString()
  return sameDay
    ? at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : formatDayMonth(iso)
}

/** "19 thg 9" — nhãn ngày ngắn dùng ở đầu màn kết buổi và kết quả chấm. */
export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })
}
