import { ScrollView, Text, View } from "react-native"
import { formatTarget, type ProgramDay } from "@/features/schedule/utils/programDays"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { cn } from "@/lib/cn"
import { ExerciseGuideBody } from "~/components/ExerciseGuideBody"
import { SectionTitle } from "~/components/SectionTitle"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"

/** Bấm một bài ở màn Chương trình (spec §3.3): ảnh động, cơ chính, cách tập, lỗi hay gặp (doc/design-anh-dong-v1.md). */
export function ExerciseGuideSheet({
  exercise,
  days,
  open,
  onClose,
}: {
  exercise: ScheduledExerciseView
  days: ProgramDay[]
  open: boolean
  onClose: () => void
}) {
  const usedIn = days.flatMap((d) =>
    d.exercises.filter((e) => e.exerciseId === exercise.exerciseId).map((e) => ({ label: d.label, target: formatTarget(e) })),
  )
  return (
    <Sheet open={open} onClose={onClose} label={exercise.exerciseName}>
      <SheetHeader title={exercise.exerciseName} onCancel={onClose} />
      <ScrollView className="px-4" contentContainerClassName="pb-4">
        <ExerciseGuideBody
          slug={exercise.exerciseSlug}
          description={exercise.description}
          muscleGroups={exercise.muscleGroups}
          stepsVi={exercise.stepsVi}
          mistakesVi={exercise.mistakesVi}
        />
        <SectionTitle className="mt-5">Trong chương trình</SectionTitle>
        <View className="mt-2 rounded-md bg-bg px-3">
          {usedIn.map((u, i) => (
            <View key={u.label} className={cn("flex-row justify-between py-2", i > 0 && "border-t border-border")}>
              <Text className="text-[13px] text-text">Buổi {u.label}</Text>
              <Text className="text-[13px] text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                {u.target}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Sheet>
  )
}
