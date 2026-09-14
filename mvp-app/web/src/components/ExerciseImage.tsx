import { useState } from "react"

/**
 * Ảnh minh hoạ động tác — dùng ở cả màn buổi tập (features/workout) và màn
 * chấm form (features/review), nên đặt ở components/ theo §4.3.
 *
 * Mỗi bài có 2 khung `<slug>-0.jpg` / `<slug>-1.jpg`, khổ ngang 850×566.
 * Thứ tự khung KHÔNG nhất quán giữa các bài (có bài khung 0 là tư thế đứng,
 * có bài khung 1 mới là tư thế đứng) — vì vậy không dùng nhãn khẳng định khung
 * nào là gì, chỉ mời chạm để xem khung còn lại bằng chữ trung tính.
 *
 * Đa số bài chưa có ảnh (mới 5 bài thí điểm) → onError ẩn hẳn khối, không để
 * lại ô ảnh vỡ hay khoảng trống lệch hàng.
 */
export function ExerciseImage({
  slug,
  alt,
  variant,
}: {
  slug: string
  alt: string
  variant: "thumb" | "large"
}) {
  const [frame, setFrame] = useState<0 | 1>(0)
  const [broken, setBroken] = useState(false)

  if (broken) return null

  const src = `/exercises/${slug}-${frame}.jpg`

  if (variant === "thumb") {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="size-11 flex-none rounded-[var(--radius-md)] object-cover"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setFrame((f) => (f === 0 ? 1 : 0))}
      className="block w-full overflow-hidden rounded-[var(--radius-md)] text-left"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="aspect-[3/2] w-full object-cover"
      />
      <span className="mt-1.5 block text-[11px] text-[var(--color-text-muted)]">
        Chạm để xem tư thế còn lại
      </span>
    </button>
  )
}
