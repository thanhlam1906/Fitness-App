import type { Ref } from "react"
import { Pressable, ScrollView, Text, View, type TextInput } from "react-native"
import { Search } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { muscleChips } from "@/lib/exerciseFilter"
import { Input } from "~/components/ui/Input"
import { colors } from "~/theme"

/**
 * Ô tìm bài (gõ không dấu vẫn ra) và hàng chip nhóm cơ chọn một, cho danh sách bài dài — bản mobile
 * của ExerciseSearch web (doc/design-gon-giao-dien-user-v1.md §6). Lọc bằng filterExercises ở nơi gọi.
 */
export function ExerciseSearch({
  exercises,
  query,
  muscle,
  onQuery,
  onMuscle,
  className,
  inputRef,
  autoFocus,
}: {
  /** Để nơi gọi trả focus về ô tìm sau "Xoá bộ lọc" (nút đó biến mất ngay khi bấm). */
  inputRef?: Ref<TextInput>
  exercises: { muscleGroups: string[] }[]
  query: string
  muscle: string | null
  onQuery: (query: string) => void
  onMuscle: (muscle: string | null) => void
  className?: string
  autoFocus?: boolean
}) {
  const chips: { value: string | null; label: string }[] = [{ value: null, label: "Tất cả" }, ...muscleChips(exercises)]
  return (
    <View className={className}>
      <View className="relative justify-center">
        <View pointerEvents="none" className="absolute left-3.5 z-10">
          <Search size={18} color={colors["text-muted"]} />
        </View>
        <Input
          ref={inputRef}
          accessibilityLabel="Tìm bài"
          placeholder="Tìm bài"
          value={query}
          onChangeText={onQuery}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          className="pl-10"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Nhóm cơ"
        className="mt-1.5"
        contentContainerClassName="gap-1.5"
      >
        {chips.map((chip) => {
          const on = chip.value === muscle
          return (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onMuscle(chip.value)}
              className={cn(
                "h-9 justify-center rounded-full border px-3.5",
                on ? "border-accent bg-accent" : "border-border bg-surface",
              )}
            >
              <Text className={cn("text-sm", on ? "font-bold text-accent-fg" : "text-text-muted")}>{chip.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** Tìm không ra bài nào: nói rõ và cho bỏ lọc một chạm. */
export function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <View className="flex-row flex-wrap items-center px-1 py-4">
      <Text className="text-sm text-text-muted">Không có bài nào khớp. </Text>
      <Pressable accessibilityRole="button" onPress={onClear} hitSlop={12}>
        <Text className="text-sm font-bold text-accent">Xoá bộ lọc</Text>
      </Pressable>
    </View>
  )
}
