import { useState } from "react"
import { Image, Pressable, Text, View } from "react-native"
import { assetUrl } from "~/lib/config"

type Props = { slug: string; alt: string; variant: "thumb" | "large" }

/**
 * Ảnh minh hoạ động tác — bản mobile của web/src/components/ExerciseImage.tsx.
 *
 * `thumb` (danh sách bài) là ảnh chụp tĩnh `<slug>-0.jpg`. `large` chỉ dùng ở chỗ xem chi tiết bài
 * nên là ảnh động `<slug>.gif` của ExerciseDB (người dùng chốt 09-27: ảnh động chỉ khi xem chi
 * tiết). Chưa có GIF thì quay về 2 khung ảnh chụp. Thứ tự khung ảnh chụp không nhất quán giữa các
 * bài nên chỉ mời chạm xem khung còn lại bằng chữ trung tính. Bài không có ảnh nào thì ẩn hẳn.
 */
export function ExerciseImage(props: Props) {
  // key theo slug: thay bài giữa buổi tập thì trạng thái khung/ảnh hỏng của bài cũ không rơi sang bài mới.
  return <ExerciseImageBody key={props.slug} {...props} />
}

function ExerciseImageBody({ slug, alt, variant }: Props) {
  const [frame, setFrame] = useState<0 | 1>(0)
  const [gifBroken, setGifBroken] = useState(false)
  const [broken, setBroken] = useState(false)

  if (broken) return null

  const still = { uri: assetUrl(`/exercises/${slug}-${frame}.jpg`) }

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

  if (!gifBroken) {
    // GIF gốc 180×180 nền trắng: giữ nền trắng trong khung bo góc thay vì kéo giãn. iOS tự chạy GIF.
    return (
      <View className="items-center rounded-md bg-white py-2.5">
        <Image
          source={{ uri: assetUrl(`/exercises/${slug}.gif`) }}
          accessibilityLabel={alt}
          onError={() => setGifBroken(true)}
          className="size-60"
        />
        <Text className="absolute bottom-2 right-2.5 text-[10px] text-text-muted">ExerciseDB</Text>
      </View>
    )
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={alt} onPress={() => setFrame((f) => (f === 0 ? 1 : 0))}>
      <Image
        source={still}
        onError={() => setBroken(true)}
        className="w-full rounded-md"
        style={{ aspectRatio: 3 / 2 }}
        resizeMode="cover"
      />
      <Text className="mt-1.5 text-[11px] text-text-muted">Chạm để xem tư thế còn lại</Text>
    </Pressable>
  )
}
