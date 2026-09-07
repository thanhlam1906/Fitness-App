/** Hiển thị số kg: bỏ .0 thừa, giữ 1 số lẻ khi có (vd tạ đơn 2.5kg mỗi bên). */
export function formatKg(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—"
  const rounded = Math.round(kg * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`
}
