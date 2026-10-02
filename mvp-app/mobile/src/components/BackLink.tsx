import { Pressable, Text } from "react-native"
import { useRouter, type Href } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { colors } from "~/theme"

/** "‹ Lịch", "‹ Cài đặt" ở đầu màn con: quay lại màn trước, mở thẳng (không có màn trước) thì về `fallback`. */
export function BackLink({ label, fallback }: { label: string; fallback: Href }) {
  const router = useRouter()
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      className="flex-row items-center gap-0.5 self-start"
      hitSlop={8}
    >
      <ChevronLeft size={16} color={colors["text-muted"]} />
      <Text className="text-sm font-semibold text-text-muted">{label}</Text>
    </Pressable>
  )
}
