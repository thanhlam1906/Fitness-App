import { useState } from "react"
import { Image, View } from "react-native"
import { cn } from "@/lib/cn"
import { exerciseImageUrl } from "@/lib/exerciseImage"
import { API_URL } from "~/lib/config"

type Props = {
  slug: string
  alt: string
  variant: "thumb" | "large"
  /**
   * Ảnh nằm trong thẻ bài của trợ lý (như bản web): `thumb` hiện trọn ảnh trên nền trắng (không cắt),
   * `large` bỏ bo góc để dải trắng sát mép khung thẻ (khung đã bo góc và cắt tràn) và cỡ 180px đúng cỡ
   * GIF gốc (240px thì phóng lên, mờ). Màn khác không truyền.
   */
  inCard?: boolean
}

/**
 * Ảnh minh hoạ động tác — bản mobile của web/src/components/ExerciseImage.tsx.
 *
 * Ảnh do admin chọn, backend phát (doc/design-anh-bai-tap-v1.md). `thumb` là ảnh tĩnh. `large` chỉ
 * dùng ở chỗ xem chi tiết bài nên là ảnh động (người dùng chốt 09-27); không có ảnh động thì quay về
 * ảnh tĩnh. Bài không có ảnh nào thì ẩn hẳn.
 */
export function ExerciseImage(props: Props) {
  // key theo slug: thay bài giữa buổi tập thì trạng thái ảnh hỏng của bài cũ không rơi sang bài mới.
  return <ExerciseImageBody key={props.slug} {...props} />
}

function ExerciseImageBody({ slug, alt, variant, inCard }: Props) {
  const [animatedBroken, setAnimatedBroken] = useState(false)
  const [broken, setBroken] = useState(false)

  if (broken) return null

  const still = { uri: `${API_URL}${exerciseImageUrl(slug, "still")}` }

  if (variant === "thumb") {
    return (
      <Image
        source={still}
        accessibilityLabel={alt}
        onError={() => setBroken(true)}
        className={cn("size-11 rounded-md", inCard && "bg-white")}
        resizeMode={inCard ? "contain" : "cover"}
      />
    )
  }

  if (!animatedBroken) {
    // Ảnh động cũ là GIF 180×180 nền trắng: giữ nền trắng trong khung bo góc. iOS tự chạy GIF.
    return (
      <View className={cn("items-center bg-white py-2.5", !inCard && "rounded-md")}>
        <Image
          source={{ uri: `${API_URL}${exerciseImageUrl(slug, "animated")}` }}
          accessibilityLabel={alt}
          onError={() => setAnimatedBroken(true)}
          className={inCard ? "size-[180px]" : "size-60"}
          resizeMode="contain"
        />
      </View>
    )
  }

  return (
    <Image
      source={still}
      accessibilityLabel={alt}
      onError={() => setBroken(true)}
      className={cn("w-full", !inCard && "rounded-md")}
      style={{ aspectRatio: 3 / 2 }}
      resizeMode="cover"
    />
  )
}
