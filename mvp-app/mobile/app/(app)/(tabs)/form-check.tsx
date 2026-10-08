import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { formatDayMonth } from "@/lib/format"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { StatusBadge } from "~/features/review/components/StatusBadge"
import { Card } from "~/components/ui/Card"
import { Skeleton } from "~/components/ui/Skeleton"
import { useReviews } from "~/features/review/api/useReviews"
import { useRefreshOnFocus } from "~/lib/focus"
import { colors } from "~/theme"

/**
 * Tab Chấm form của mobile v1 — CHỈ xem kết quả đã chấm (doc/design-mobile-v1.md §5, mốc 7). Camera
 * chấm trực tiếp cần thư viện native ngoài Expo Go nên chấm mới vẫn ở bản web; danh sách lấy từ
 * phần "Lần gửi gần đây" của FormCheckListPage web.
 */
export default function FormCheckScreen() {
  const router = useRouter()
  const reviews = useReviews()
  // Lần chấm mới gửi từ bản web: quay lại tab là thấy.
  useRefreshOnFocus(reviews.refetch)

  return (
    <Screen>
      <Text className="text-[28px] font-extrabold tracking-[-0.5px] text-text">Chấm form</Text>
      <Text className="mt-2.5 text-[13px] leading-5 text-text-muted">
        Xem lại kết quả chấm kỹ thuật của bạn. Muốn chấm mới thì dùng bản web.
      </Text>

      <Kicker className="mt-7">Lần gửi gần đây</Kicker>
      {reviews.isLoading && (
        <View accessible accessibilityLabel="Đang tải" className="mt-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </View>
      )}
      {reviews.isError && <Text className="mt-3 text-sm text-danger">{reviews.error.message}</Text>}
      {reviews.data && reviews.data.length === 0 && (
        <Card className="mt-3">
          <Text className="text-sm text-text-muted">Chưa có lần chấm nào. Chấm thử trên bản web, kết quả sẽ hiện ở đây.</Text>
        </Card>
      )}

      <View className="mt-2.5 gap-2">
        {reviews.data?.map((review) => (
          <Pressable
            key={review.id}
            accessibilityRole="link"
            onPress={() => router.push(`/form-check/result/${review.id}`)}
            className="flex-row items-center gap-2.5 rounded-md bg-surface px-3.5 py-3 active:bg-surface-2"
          >
            <View className="flex-1">
              <Text className="text-sm text-text" numberOfLines={1}>
                {review.exerciseName ?? "Chưa rõ bài"}
              </Text>
              <Text className="text-xs text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                {formatDayMonth(review.createdAt)}
              </Text>
            </View>
            <StatusBadge status={review.rejectReason === "UNKNOWN_EXERCISE" ? "NEEDS_EXERCISE" : review.status} />
            <ChevronRight size={16} color={colors["text-muted"]} />
          </Pressable>
        ))}
      </View>
    </Screen>
  )
}
