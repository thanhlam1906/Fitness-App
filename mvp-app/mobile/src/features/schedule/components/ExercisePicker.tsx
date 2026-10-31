import { useRef, useState } from "react"
import { Pressable, ScrollView, Text, View, type TextInput } from "react-native"
import { ChevronRight } from "lucide-react-native"
import type { Exercise } from "@/features/exercise/types"
import { filterExercises } from "@/lib/exerciseFilter"
import { ExerciseImage } from "~/components/ExerciseImage"
import { ExerciseSearch, NoMatch } from "~/components/ExerciseSearch"
import { colors } from "~/theme"

/**
 * Chọn một bài trong khung trượt (sửa buổi, tự thiết kế lịch) — bản mobile của ExercisePicker web: ô tìm
 * không dấu và chip nhóm cơ thay cho danh sách xổ ra cả ~40 bài (doc/design-gon-giao-dien-user-v1.md §6).
 * Ô tìm đứng yên ở đầu, chỉ danh sách cuộn (web dùng sticky trong vùng cuộn của khung).
 */
export function ExercisePicker({
  exercises,
  onPick,
  autoFocus = false,
}: {
  exercises: Exercise[]
  onPick: (exercise: Exercise) => void
  /** Mở thành trang con trong khung: đưa focus vào ô tìm. */
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const searchRef = useRef<TextInput>(null)
  const sorted = [...exercises].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
  const visible = filterExercises(sorted, query, muscle)

  return (
    <View className="flex-shrink">
      <View className="px-4 pb-2">
        <ExerciseSearch
          inputRef={searchRef}
          autoFocus={autoFocus}
          exercises={sorted}
          query={query}
          muscle={muscle}
          onQuery={setQuery}
          onMuscle={setMuscle}
        />
      </View>
      <ScrollView
        className="flex-shrink"
        contentContainerClassName="mt-1 gap-1.5 px-4 pb-7"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
            accessibilityRole="button"
            onPress={() => onPick(exercise)}
            className="flex-row items-center gap-2.5 rounded-md bg-bg p-2.5 active:bg-surface-2"
          >
            <ExerciseImage slug={exercise.slug} alt="" variant="thumb" />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
                {exercise.nameEn}
              </Text>
              {exercise.nameVi && (
                <Text className="text-[13px] text-text-muted" numberOfLines={1}>
                  {exercise.nameVi}
                </Text>
              )}
            </View>
            <ChevronRight size={18} color={colors["text-muted"]} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
