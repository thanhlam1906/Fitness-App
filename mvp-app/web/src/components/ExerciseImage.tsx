import { useState } from "react"
import { cn } from "@/lib/cn"
import { exerciseImageUrl } from "@/lib/exerciseImage"

type Props = {
  slug: string
  alt: string
  variant: "thumb" | "large"
  /**
   * Ảnh nằm trong thẻ bài của trợ lý (mockup doc/mockup-thu-vien-bai/demo.html): `thumb` hiện trọn ảnh
   * trên nền trắng (không cắt), `large` bỏ bo góc để dải trắng sát mép khung thẻ (khung đã bo góc và cắt
   * tràn) và cỡ 180px đúng cỡ GIF gốc (240px thì phóng lên, mờ). Màn khác không truyền.
   */
  inCard?: boolean
}

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

function ExerciseImageBody({ slug, alt, variant, inCard }: Props) {
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
        className={cn("size-11 flex-none rounded-[var(--radius-md)] object-cover", inCard && "bg-white object-contain")}
      />
    )
  }

  if (!animatedBroken) {
    // Ảnh động cũ là GIF 180×180 nền trắng: giữ nền trắng trong khung bo góc, không kéo giãn.
    return (
      <div className={cn("grid place-items-center bg-white py-2.5", !inCard && "rounded-[var(--radius-md)]")}>
        <img
          src={exerciseImageUrl(slug, "animated")}
          alt={alt}
          onError={() => setAnimatedBroken(true)}
          className={cn("object-contain", inCard ? "size-45" : "size-60")}
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
      className={cn("aspect-[3/2] w-full object-cover", !inCard && "rounded-[var(--radius-md)]")}
    />
  )
}
