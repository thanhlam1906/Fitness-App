import { Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ApiError } from "~/api/client"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { SegmentBar, type Segment } from "~/components/SegmentBar"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { useSchedule } from "~/features/schedule/useSchedule"
import { ExerciseLogger } from "~/features/workout/ExerciseLogger"
import { useWorkoutSession } from "~/features/workout/useWorkoutSession"

/**
 * Màn 5 concept-frontend-v1.md — buổi tập, log từng set. Bản mobile của WorkoutPage web. Xem MỘT
 * bài mỗi lần ("Bài 1 / 4" + thanh chia đốt): giữa buổi chỉ cần thấy bài đang tập. Bài đang xem nằm
 * ở tham số `bai` của route như `?bai=` bên web.
 */
export default function WorkoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ scheduledWorkoutId: string; bai?: string }>()
  const scheduledWorkoutId = params.scheduledWorkoutId
  const schedule = useSchedule()
  const session = useWorkoutSession(scheduledWorkoutId)

  const workout = schedule.data?.workouts.find((w) => w.id === scheduledWorkoutId)

  if (schedule.isLoading || session.isLoading) {
    return (
      <Screen>
        <Text className="text-sm text-text-muted">Đang chuẩn bị buổi tập…</Text>
      </Screen>
    )
  }
  if (session.isError && session.error instanceof ApiError && session.error.status === 409) {
    // Ngày đã tập xong: xem lại ở màn Lịch, không tạo buổi mới.
    return (
      <Screen>
        <Card className="gap-3">
          <Text className="text-sm text-text-muted">Buổi này đã tập xong.</Text>
          <Button
            variant="secondary"
            onPress={() => router.replace(workout ? `/schedule?ngay=${workout.scheduledOn}` : "/schedule")}
          >
            Xem lại ở Lịch
          </Button>
        </Card>
      </Screen>
    )
  }
  if (session.isError) {
    return (
      <Screen>
        <Card className="gap-3">
          <Text className="text-sm text-danger">Không mở được buổi tập: {session.error.message}</Text>
          <Button variant="secondary" onPress={() => session.refetch()}>
            Thử lại
          </Button>
        </Card>
      </Screen>
    )
  }
  if (!workout) {
    return (
      <Screen>
        <Text className="text-sm text-danger">Không tìm thấy buổi tập này trong lịch.</Text>
      </Screen>
    )
  }

  const sets = session.data!.sets
  const exercises = workout.exercises
  const index = clamp(Number(params.bai ?? 0), 0, exercises.length - 1)
  const exercise = exercises[index]
  const next = exercises[index + 1]

  function goTo(i: number) {
    router.setParams({ bai: String(i) })
  }

  return (
    <Screen>
      <View className="flex-row justify-between">
        <Kicker>Buổi {workout.label ?? ""}</Kicker>
        <Kicker style={{ fontVariant: ["tabular-nums"] }}>
          Bài {index + 1} / {exercises.length}
        </Kicker>
      </View>
      <SegmentBar
        className="mt-2.5"
        segments={exercises.map((ex, i): Segment => {
          const logged = sets.filter((s) => s.exerciseId === ex.exerciseId).length
          if (logged >= ex.targetSets) return "done"
          return i === index ? "current" : "todo"
        })}
      />

      <ExerciseLogger
        key={exercise.id}
        exercise={exercise}
        scheduledWorkoutId={scheduledWorkoutId}
        sessionId={session.data!.id}
        loggedSets={sets.filter((s) => s.exerciseId === exercise.exerciseId)}
      />

      <View className="mt-auto flex-row items-center gap-3 pt-6">
        {index > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bài trước"
            onPress={() => goTo(index - 1)}
            className="size-8 items-center justify-center rounded-lg bg-surface"
          >
            <Text className="text-text-muted">‹</Text>
          </Pressable>
        )}
        {next ? (
          <Pressable accessibilityRole="button" onPress={() => goTo(index + 1)} className="flex-1">
            <Text className="text-xs text-text-muted" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
              Tiếp: {next.exerciseName} {next.targetSets}×{next.targetReps} ›
            </Text>
          </Pressable>
        ) : (
          <View className="flex-1" />
        )}
        <Pressable accessibilityRole="link" onPress={() => router.push(`/workout/${scheduledWorkoutId}/finish`)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-accent">Kết buổi</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}
