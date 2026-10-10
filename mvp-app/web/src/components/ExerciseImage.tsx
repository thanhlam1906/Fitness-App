import { useState } from "react"
import { exerciseImageUrl } from "@/lib/exerciseImage"

type Props = { slug: string; alt: string; variant: "thumb" | "large" }

/**
 * Ảnh minh hoạ động tác — dùng ở cả màn buổi tập (features/workout) và màn
 * chấm form (features/review), nên đặt ở components/ theo §4.3.
 *
 * Ảnh do admin chọn, backend phát (doc/design-anh-bai-tap-v1.md). `thumb` là ảnh tĩnh.
 * `large` chỉ dùng ở chỗ xem chi tiết bài nên là ảnh động (người dùng chốt 09-27: ảnh động
 * chỉ khi bấm vào chi tiết); bài không có ảnh động thì quay về ảnh tĩnh.
 *
 * Bài chưa có ảnh nào → onError ẩn hẳn khối, không để lại ô ảnh vỡ hay khoảng trống lệch hàng.
 */
export function ExerciseImage(props: Props) {
  // key theo slug: thay bài giữa buổi tập giữ nguyên chỗ trên cây component, trạng thái
  // ảnh hỏng của bài cũ không được rơi sang bài mới.
  return <ExerciseImageBody key={props.slug} {...props} />
}

function ExerciseImageBody({ slug, alt, variant }: Props) {
  const [animatedBroken, setAnimatedBroken] = useState(false)
  const [broken, setBroken] = useState(false)

  if (broken) return null

  const still = exerciseImageUrl(slug, "still")

  if (variant === "thumb") {
    return (
      <img
        src={still}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="size-11 flex-none rounded-[var(--radius-md)] object-cover"
      />
    )
  }

  if (!animatedBroken) {
    // Ảnh động cũ là GIF 180×180 nền trắng: giữ nền trắng trong khung bo góc, không kéo giãn.
    return (
      <div className="grid place-items-center rounded-[var(--radius-md)] bg-white py-2.5">
        <img
          src={exerciseImageUrl(slug, "animated")}
          alt={alt}
          onError={() => setAnimatedBroken(true)}
          className="size-60 object-contain"
        />
      </div>
    )
  }

  return (
    <img
      src={still}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="aspect-[3/2] w-full rounded-[var(--radius-md)] object-cover"
    />
  )
}
