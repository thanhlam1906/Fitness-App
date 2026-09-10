import { Link, useParams, useSearchParams } from "react-router"
import { SegmentBar, type Segment } from "@/components/SegmentBar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlowScreen } from "@/components/UserShell"
import { useSchedule } from "@/features/schedule/useSchedule"
import { ExerciseLogger } from "./ExerciseLogger"
import { useWorkoutSession } from "./useWorkoutSession"

/**
 * Màn 5 concept-frontend-v1.md — buổi tập, log từng set.
 *
 * Design cho xem MỘT bài mỗi lần ("Bài 1 / 4" cộng thanh chia đốt) thay vì đổ
 * cả buổi ra một trang: giữa buổi, thứ duy nhất cần thấy là bài đang tập.
 *
 * Bài đang xem nằm ở URL (?bai=) theo §5.1 — khoá màn hình giữa buổi rồi mở
 * lại vẫn đúng bài.
 */
export function WorkoutPage() {
  const { scheduledWorkoutId } = useParams<{ scheduledWorkoutId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const schedule = useSchedule()
  const session = useWorkoutSession(scheduledWorkoutId!)

  const workout = schedule.data?.workouts.find((w) => w.id === scheduledWorkoutId)

  if (schedule.isLoading || session.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang chuẩn bị buổi tập…</p>
  }
  if (session.isError) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">
          Không mở được buổi tập: {session.error.message}
        </p>
        <Button variant="secondary" onClick={() => session.refetch()}>
          Thử lại
        </Button>
      </Card>
    )
  }
  if (!workout) {
    return (
      <p className="text-sm text-[var(--color-danger)]">Không tìm thấy buổi tập này trong lịch.</p>
    )
  }

  const sets = session.data!.sets
  const exercises = workout.exercises
  const index = clamp(Number(searchParams.get("bai") ?? 0), 0, exercises.length - 1)
  const exercise = exercises[index]
  const next = exercises[index + 1]

  function goTo(i: number) {
    setSearchParams({ bai: String(i) })
  }

  return (
    <FlowScreen>
      <div className="kicker flex justify-between">
        <span>Buổi {workout.label ?? ""}</span>
        <span className="num">
          Bài {index + 1} / {exercises.length}
        </span>
      </div>
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
        scheduledWorkoutId={scheduledWorkoutId!}
        sessionId={session.data!.id}
        loggedSets={sets.filter((s) => s.exerciseId === exercise.exerciseId)}
      />

      <div className="flex-1" />

      <div className="mt-6 flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            aria-label="Bài trước"
            onClick={() => goTo(index - 1)}
            className="size-8 flex-none rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ‹
          </button>
        )}
        {next ? (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="num flex-1 truncate text-left text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Tiếp: {next.exerciseName} {next.targetSets}×{next.targetReps} ›
          </button>
        ) : (
          <span className="flex-1" />
        )}
        <Link
          to={`/workout/${scheduledWorkoutId}/finish`}
          className="text-[13px] font-semibold text-[var(--color-accent)]"
        >
          Kết buổi
        </Link>
      </div>
    </FlowScreen>
  )
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}
