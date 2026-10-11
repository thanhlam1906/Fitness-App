import { useState } from "react"
import { Image, View } from "react-native"
import { exerciseImageUrl } from "@/lib/exerciseImage"
import { API_URL } from "~/lib/config"

type Props = { slug: string; alt: string; variant: "thumb" | "large" }

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

function ExerciseImageBody({ slug, alt, variant }: Props) {
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
        className="size-11 rounded-md"
        resizeMode="cover"
      />
    )
  }

  if (!animatedBroken) {
    // Ảnh động cũ là GIF 180×180 nền trắng: giữ nền trắng trong khung bo góc. iOS tự chạy GIF.
    return (
      <View className="items-center rounded-md bg-white py-2.5">
        <Image
          source={{ uri: `${API_URL}${exerciseImageUrl(slug, "animated")}` }}
          accessibilityLabel={alt}
          onError={() => setAnimatedBroken(true)}
          className="size-60"
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
      className="w-full rounded-md"
      style={{ aspectRatio: 3 / 2 }}
      resizeMode="cover"
    />
  )
}
