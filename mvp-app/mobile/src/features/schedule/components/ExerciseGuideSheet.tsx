import { ScrollView, Text, View } from "react-native"
import { formatTarget, type ProgramDay } from "@/features/schedule/utils/programDays"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { cn } from "@/lib/cn"
import { ExerciseImage } from "~/components/ExerciseImage"
import { Kicker } from "~/components/Kicker"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"

// Mã nhóm cơ trong bảng exercises (muscle_groups) → chữ hiện cho người dùng. Giống web.
const MUSCLE_VI: Record<string, string> = {
  QUADS: "Đùi trước",
  HAMSTRINGS: "Đùi sau",
  GLUTES: "Mông",
  CORE: "Bụng",
  LOWER_BACK: "Lưng dưới",
  UPPER_BACK: "Lưng trên",
  LATS: "Xô",
  CHEST: "Ngực",
  SHOULDERS: "Vai",
  TRICEPS: "Tay sau",
  BICEPS: "Tay trước",
}

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
        <ExerciseImage slug={exercise.exerciseSlug} alt={exercise.exerciseName} variant="large" />
        {exercise.description && <Text className="mt-3.5 text-sm leading-[22px] text-text">{exercise.description}</Text>}

        {exercise.muscleGroups.length > 0 && (
          <>
            <Kicker className="mt-5">Cơ chính</Kicker>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {exercise.muscleGroups.map((code, i) => (
                <View key={code} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-accent-tint" : "bg-surface-2")}>
                  <Text className={cn("text-xs font-bold", i === 0 ? "text-accent" : "text-text-muted")}>
                    {MUSCLE_VI[code] ?? code}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {exercise.stepsVi.length > 0 && (
          <>
            <Kicker className="mt-5">Cách tập</Kicker>
            <View className="mt-1.5">
              {exercise.stepsVi.map((step, i) => (
                <View key={step} className="flex-row gap-2.5 py-1.5">
                  <View className="mt-0.5 size-[22px] items-center justify-center rounded-full bg-surface-2">
                    <Text className="text-xs font-extrabold text-text">{i + 1}</Text>
                  </View>
                  <Text className="flex-1 text-sm leading-[22px] text-text">{step}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {exercise.mistakesVi.length > 0 && (
          <>
            <Kicker className="mt-5">Lỗi hay gặp</Kicker>
            <View className="mt-2 rounded-md border border-warn/30 bg-warn-tint px-3 py-1">
              {exercise.mistakesVi.map((m) => (
                <View key={m} className="flex-row gap-2 py-1.5">
                  <Text className="font-extrabold text-warn">!</Text>
                  <Text className="flex-1 text-[13px] leading-5 text-text">{m}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Kicker className="mt-5">Trong chương trình</Kicker>
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
