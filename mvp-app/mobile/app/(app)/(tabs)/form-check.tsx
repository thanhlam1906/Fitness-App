import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ChevronRight, Dumbbell } from "lucide-react-native"
import { formatDayMonth } from "@/lib/format"
import { ExerciseImage } from "~/components/ExerciseImage"
import { Screen } from "~/components/Screen"
import { Stepper } from "~/components/Stepper"
import { IconText, StatusBlock } from "~/components/StatusViews"
import { Skeleton } from "~/components/ui/Skeleton"
import { useExercises } from "~/features/exercise/api/useExercises"
import { Section } from "~/features/review/components/Section"
import { StatusBadge } from "~/features/review/components/StatusBadge"
import { useReviews } from "~/features/review/api/useReviews"
import { useRefreshOnFocus } from "~/lib/focus"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Tab Chấm form — bản mobile của FormCheckListPage web: chọn bài trước, rồi quay clip cho bài đó.
 * Chỉ liệt kê bài chấm được (người dùng chốt 10-06). Khác web: bấm bài là sang màn quay clip, vì
 * mobile không có màn camera nhận dạng trực tiếp (cần thư viện native ngoài Expo Go), và câu dẫn
 * không nói "hình ảnh không rời máy" vì clip có gửi lên máy chủ.
 */
export default function FormCheckScreen() {
  const router = useRouter()
  const exercises = useExercises()
  const reviews = useReviews()
  // Lần chấm gửi từ bản web: quay lại tab là thấy.
  useRefreshOnFocus(reviews.refetch)

  const analyzable = (exercises.data ?? []).filter((e) => e.active && e.analyzable)
  const latest = reviews.data?.[0]

  return (
    <Screen>
      <Stepper label="Kiểm tra form" steps={3} current={0} />
      <Text className="mt-5 text-[28px] font-extrabold tracking-[-0.5px] text-text">Chấm form</Text>
      <Text className="mt-2.5 text-[13px] leading-5 text-text-muted">
        Chọn bài, quay mỗi góc một clip 3–5 rep. Clip bị xoá ngay sau khi chấm.
      </Text>

      <View className="mt-6 gap-3">
        {exercises.isLoading && (
          // Khung của thẻ "Chọn bài để chấm": dòng tiêu đề rồi các dòng bài.
          <View accessible accessibilityLabel="Đang tải" className="rounded-lg bg-surface px-3.5 pb-3">
            <Skeleton className="my-[18px] h-4 w-40" />
            <View className="gap-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[68px]" />
              ))}
            </View>
          </View>
        )}
        {exercises.isError && <IconText>{exercises.error.message}</IconText>}

        {/* Thẻ gập thay cho một danh sách dài: thẻ chọn bài mở sẵn vì đó là việc người dùng đến đây để
            làm; lịch sử ít khi cần nên nằm sau một lần bấm. */}
        {exercises.data && (
          <Section title="Chọn bài để chấm" meta={String(analyzable.length)} open>
            <View className="gap-1.5">
              {analyzable.length === 0 && (
                <StatusBlock
                  icon={Dumbbell}
                  title="Chưa có bài chấm form được"
                  detail="Quản trị viên cần thêm khớp cần kiểm cho bài."
                  className="py-5"
                />
              )}
              {analyzable.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="link"
                  onPress={() => router.push(`/form-check/${exercise.id}`)}
                  className="flex-row items-center gap-2.5 rounded-md bg-surface-2 p-3 active:opacity-80"
                >
                  <ExerciseImage slug={exercise.slug} alt={exercise.nameVi ?? exercise.nameEn} variant="thumb" />
                  <Text className="flex-1 text-base font-semibold text-text" numberOfLines={1}>
                    {exercise.nameVi ?? exercise.nameEn}
                  </Text>
                  <ChevronRight size={16} color={colors.accent} />
                </Pressable>
              ))}
            </View>
          </Section>
        )}

        {reviews.isError && <IconText>{reviews.error.message}</IconText>}
        {reviews.data && reviews.data.length > 0 && (
          <Section title="Lần gửi gần đây" meta={String(reviews.data.length)}>
            <View className="gap-1.5">
              {reviews.data.map((review) => (
                <Pressable
                  key={review.id}
                  accessibilityRole="link"
                  onPress={() => router.push(`/form-check/result/${review.id}`)}
                  className="flex-row items-center gap-2.5 rounded-md bg-surface-2 px-3.5 py-3 active:opacity-80"
                >
                  <View className="flex-1">
                    <Text className="text-sm text-text" numberOfLines={1}>
                      {review.exerciseName ?? "Chưa rõ bài"}
                    </Text>
                    <Text className="text-xs text-text-muted" style={NUM}>
                      {formatDayMonth(review.createdAt)}
                    </Text>
                  </View>
                  <StatusBadge status={review.rejectReason === "UNKNOWN_EXERCISE" ? "NEEDS_EXERCISE" : review.status} />
                </Pressable>
              ))}
            </View>
          </Section>
        )}
      </View>

      {latest && (
        <Text className="mt-5 text-[11px] text-text-muted" style={NUM}>
          Lần chấm gần nhất: {latest.exerciseName ?? "chưa rõ bài"}, {formatDayMonth(latest.createdAt)}.
        </Text>
      )}
    </Screen>
  )
}
