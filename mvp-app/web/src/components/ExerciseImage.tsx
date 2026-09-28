import { useState } from "react"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"

type Props = { slug: string; alt: string; variant: "thumb" | "large" }

/**
 * Ảnh minh hoạ động tác — dùng ở cả màn buổi tập (features/workout) và màn
 * chấm form (features/review), nên đặt ở components/ theo §4.3.
 *
 * `thumb` (danh sách bài) là ảnh chụp tĩnh `<slug>-0.jpg`. `large` chỉ dùng ở chỗ xem
 * chi tiết bài nên là ảnh động `<slug>.gif` của ExerciseDB (doc/design-anh-dong-v1.md,
 * người dùng chốt: ảnh động chỉ khi bấm vào chi tiết). Chưa có GIF thì quay về 2 khung
 * ảnh chụp, khổ ngang 850×566.
 *
 * Thứ tự khung ảnh chụp KHÔNG nhất quán giữa các bài (có bài khung 0 là tư thế đứng,
 * có bài khung 1 mới là tư thế đứng) — vì vậy không dùng nhãn khẳng định khung
 * nào là gì, chỉ mời chạm để xem khung còn lại bằng chữ trung tính.
 *
 * Bài chưa có ảnh nào → onError ẩn hẳn khối, không để lại ô ảnh vỡ hay khoảng trống lệch hàng.
 */
export function ExerciseImage(props: Props) {
  // key theo slug: thay bài giữa buổi tập giữ nguyên chỗ trên cây component, trạng thái
  // khung/ảnh hỏng của bài cũ không được rơi sang bài mới.
  return <ExerciseImageBody key={props.slug} {...props} />
}

function ExerciseImageBody({ slug, alt, variant }: Props) {
  const [frame, setFrame] = useState<0 | 1>(0)
  const [gifBroken, setGifBroken] = useState(false)
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

  if (!gifBroken) {
    // GIF gốc 180×180 nền trắng: giữ nền trắng trong khung bo góc thay vì kéo giãn.
    return (
      <div className="relative grid place-items-center rounded-[var(--radius-md)] bg-white py-2.5">
        <img src={`/exercises/${slug}.gif`} alt={alt} onError={() => setGifBroken(true)} className="size-60" />
        <span className="absolute right-2.5 bottom-2 text-[10px] text-[var(--color-text-muted)]">ExerciseDB</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setFrame((f) => (f === 0 ? 1 : 0))}
      className={cn("block w-full overflow-hidden rounded-[var(--radius-md)] text-left", SHEET_FOCUS)}
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
