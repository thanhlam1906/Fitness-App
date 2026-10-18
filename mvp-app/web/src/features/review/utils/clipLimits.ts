/**
 * Giới hạn cỡ clip khi gửi để chấm, dùng chung web và mobile (mobile import qua alias @/).
 * Mỗi clip khớp spring.servlet.multipart.max-file-size (60MB) của backend. Tổng: Cloudflare chặn mọi
 * request trên 100 MB, mà các clip đi chung một request, nên chặn tổng 95 MB, chừa chỗ cho phần khung
 * của form (doc/design-trien-khai-v1.md §7). Backend max-request-size 96MB, nginx 96m.
 */
export const MAX_CLIP_MB = 60
export const MAX_TOTAL_MB = 95

const MB = 1024 * 1024

/** "clip": có clip vượt 60 MB; "total": từng clip ổn nhưng cộng lại vượt 95 MB; null: gửi được.
 *  Clip chưa biết cỡ (mobile đôi khi không lấy được) tính 0, để backend chặn nếu lỡ quá. */
export function clipSizeProblem(sizes: (number | null)[]): "clip" | "total" | null {
  if (sizes.some((s) => s !== null && s > MAX_CLIP_MB * MB)) return "clip"
  const total = sizes.reduce<number>((sum, s) => sum + (s ?? 0), 0)
  return total > MAX_TOTAL_MB * MB ? "total" : null
}
