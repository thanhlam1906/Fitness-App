import { Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { CircleCheckBig, CloudOff, SearchX } from "lucide-react-native"
import { ApiError } from "~/api/client"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { SegmentBar, type Segment } from "~/features/workout/components/SegmentBar"
import { Button } from "~/components/ui/Button"
import { Skeleton } from "~/components/ui/Skeleton"
import { StatusBlock } from "~/components/StatusViews"
import { useSchedule } from "~/features/schedule/api/useSchedule"
import { ExerciseLogger } from "~/features/workout/components/ExerciseLogger"
import { useWorkoutSession } from "~/features/workout/api/useWorkoutSession"

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
    return <WorkoutSkeleton />
  }
  const finished =
    (session.isError && session.error instanceof ApiError && session.error.status === 409) ||
    session.data?.status === "DONE"
  if (finished) {
    // Ngày đã tập xong (409 khi mở lại, hoặc vừa kết buổi xong): xem lại ở màn Lịch, không tạo buổi mới.
    return (
      <Screen>
        <StatusBlock icon={CircleCheckBig} tone="success" title="Buổi này đã tập xong">
          <Button
            variant="secondary"
            onPress={() => router.dismissTo(workout ? `/schedule?ngay=${workout.scheduledOn}` : "/schedule")}
          >
            Xem lại ở Lịch
          </Button>
        </StatusBlock>
      </Screen>
    )
  }
  if (session.isError) {
    return (
      <Screen>
        <StatusBlock icon={CloudOff} tone="danger" title="Không mở được buổi tập" detail={session.error.message}>
          <Button variant="secondary" onPress={() => session.refetch()}>
            Thử lại
          </Button>
        </StatusBlock>
      </Screen>
    )
  }
  if (!workout) {
    return (
      <Screen>
        <StatusBlock icon={SearchX} tone="danger" title="Không tìm thấy buổi tập">
          <Button variant="secondary" onPress={() => router.dismissTo("/schedule")}>
            Về lịch
          </Button>
        </StatusBlock>
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

/** Cùng khung với màn buổi tập: kicker + thanh đốt, tên bài, số tải lớn, các dòng set, hàng điều hướng. */
function WorkoutSkeleton() {
  return (
    <Screen>
      <View accessible accessibilityLabel="Đang tải" className="flex-1">
        <View className="flex-row justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </View>
        <Skeleton className="mt-2.5 h-1.5" />
        <Skeleton className="mt-5 h-7 w-56" />
        <Skeleton className="mt-4 h-14" />
        <Skeleton className="mt-3 h-20 w-48" />
        <View className="mt-6 gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-40" />
          <Skeleton className="h-14" />
        </View>
        <View className="mt-auto flex-row justify-between gap-3 pt-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </View>
      </View>
    </Screen>
  )
}
