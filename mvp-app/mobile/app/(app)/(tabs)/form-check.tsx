import { useRef, useState } from "react"
import { Pressable, Text, View, type TextInput } from "react-native"
import { useRouter } from "expo-router"
import { ChevronRight, Dumbbell } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { filterExercises } from "@/lib/exerciseFilter"
import { formatDayMonth } from "@/lib/format"
import { ExerciseImage } from "~/components/ExerciseImage"
import { ExerciseSearch, NoMatch } from "~/components/ExerciseSearch"
import { Screen } from "~/components/Screen"
import { IconText, StatusBlock } from "~/components/StatusViews"
import { Skeleton } from "~/components/ui/Skeleton"
import { useExercises } from "~/features/exercise/api/useExercises"
import { Section } from "~/features/review/components/Section"
import { StatusBadge } from "~/features/review/components/StatusBadge"
import { useReviews } from "~/features/review/api/useReviews"
import { useRefreshOnFocus } from "~/lib/focus"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

// ponytail: ngưỡng cố định như web; dưới mức này danh sách ngắn nhìn là thấy, ô tìm chỉ thêm chữ.
const SEARCH_FROM = 8

/**
 * Tab Chấm form — bản mobile của FormCheckListPage web: chọn bài trước, rồi quay video cho bài đó.
 * Chỉ liệt kê bài chấm được (người dùng chốt 10-06). Ô tìm và chip nhóm cơ cho danh sách dài
 * (doc/design-gon-giao-dien-user-v1.md §6). Khác web: bấm bài là sang màn quay video, vì mobile
 * không có màn camera nhận dạng trực tiếp (cần thư viện native ngoài Expo Go).
 */
export default function FormCheckScreen() {
  const router = useRouter()
  const exercises = useExercises()
  const reviews = useReviews()
  // Lần chấm gửi từ bản web: quay lại tab là thấy.
  useRefreshOnFocus(reviews.refetch)
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const searchRef = useRef<TextInput>(null)

  // API trả không theo thứ tự nào (findAll không ORDER BY): sắp theo tên để bài không nhảy chỗ.
  const analyzable = (exercises.data ?? [])
    .filter((e) => e.active && e.analyzable)
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
  const searchable = analyzable.length >= SEARCH_FROM
  const visible = searchable ? filterExercises(analyzable, query, muscle) : analyzable

  return (
    <Screen>
      <Text className="text-[28px] font-extrabold leading-[35px] tracking-[-0.5px] text-text">Chấm form</Text>

      {exercises.isLoading && (
        <View accessible accessibilityLabel="Đang tải" className="mt-5 gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </View>
      )}
      {exercises.isError && <IconText className="mt-5">{exercises.error.message}</IconText>}
      {exercises.data && analyzable.length === 0 && (
        <StatusBlock icon={Dumbbell} title="Chưa có bài chấm form được" className="mt-5" />
      )}

      {searchable && (
        <ExerciseSearch
          inputRef={searchRef}
          className="mt-5"
          exercises={analyzable}
          query={query}
          muscle={muscle}
          onQuery={setQuery}
          onMuscle={setMuscle}
        />
      )}
      {analyzable.length > 0 && (
        <View className={cn("gap-1.5", searchable ? "mt-3" : "mt-5")}>
          {visible.length === 0 && (
            <NoMatch
              onClear={() => {
                setQuery("")
                setMuscle(null)
                searchRef.current?.focus()
              }}
            />
          )}
          {visible.map((exercise) => (
            <Pressable
              key={exercise.id}
              accessibilityRole="link"
              onPress={() => router.push(`/form-check/${exercise.id}`)}
              className="flex-row items-center gap-2.5 rounded-md bg-surface p-3 active:opacity-80"
            >
              <ExerciseImage slug={exercise.slug} alt="" variant="thumb" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-text" numberOfLines={1}>
                  {exercise.nameEn}
                </Text>
                {/* Tìm "day nguc" mà ra Bench Press: thấy tên Việt mới hiểu vì sao khớp. */}
                {exercise.nameVi && (
                  <Text className="text-[13px] text-text-muted" numberOfLines={1}>
                    {exercise.nameVi}
                  </Text>
                )}
              </View>
              <ChevronRight size={18} color={colors["text-muted"]} />
            </Pressable>
          ))}
        </View>
      )}

      {reviews.isError && <IconText className="mt-5">{reviews.error.message}</IconText>}
      {reviews.data && reviews.data.length > 0 && (
        <View className="mt-6">
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
        </View>
      )}
    </Screen>
  )
}
