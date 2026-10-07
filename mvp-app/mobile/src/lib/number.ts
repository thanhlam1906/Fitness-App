// Ô số trên iPhone: bàn phím số tiếng Việt gõ dấu phẩy thập phân và cho gõ "62,,5" — ô
// type="number" của web không bao giờ ra chuỗi như vậy (code-reviewer 10-02 #3).

/** Giữ chữ số và MỘT dấu phẩy thập phân (dấu chấm cũng đổi thành phẩy): "62,,5" → "62,5". */
export function cleanDecimal(text: string): string {
  const s = text.replace(/\./g, ",").replace(/[^\d,]/g, "")
  const i = s.indexOf(",")
  return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "")
}

/** Số từ chuỗi gõ tay; rỗng hay chỉ có dấu phẩy thì NaN. */
export function parseDecimal(text: string): number {
  const s = cleanDecimal(text)
  return s === "" || s === "," ? NaN : Number(s.replace(",", "."))
}
