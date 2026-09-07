import { Link } from "react-router"
import { useCurrentUser } from "@/auth/CurrentUserContext"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatKg } from "@/lib/format"
import { useSchedule } from "./useSchedule"

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Chưa tập",
  DONE: "Đã xong",
  SKIPPED: "Đã bỏ qua",
  MISSED: "Bỏ lỡ",
}

/** concept-frontend-v1.md màn 4 — "Lịch tuần", nguồn sự thật. */
export function SchedulePage() {
  const { userId } = useCurrentUser()
  const schedule = useSchedule(userId!)

  if (schedule.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }

  if (schedule.isError) {
    const isNotFound = schedule.error instanceof ApiError && schedule.error.status === 404
    if (isNotFound) {
      return (
        <Card className="space-y-3 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Chưa có chương trình đang chạy.</p>
          <Link to="/program">
            <Button>Chọn chương trình</Button>
          </Link>
        </Card>
      )
    }
    return <p className="text-sm text-[var(--color-danger)]">{schedule.error.message}</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Lịch tập</h1>
      <div className="space-y-3">
        {schedule.data?.workouts.map((w) => (
          <Link key={w.id} to={`/workout/${w.id}`}>
            <Card className="space-y-2 hover:border-[var(--color-accent)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {w.scheduledOn} · Buổi {w.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Tuần {w.weekIndex}</p>
                </div>
                <span
                  className={
                    "text-xs " +
                    (w.status === "DONE" ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]")
                  }
                >
                  {STATUS_LABEL[w.status] ?? w.status}
                </span>
              </div>
              <ul className="space-y-1">
                {w.exercises.map((ex) => (
                  <li key={ex.id} className="num flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span>
                      {ex.exerciseName} · {ex.targetSets}×{ex.targetReps}
                      {ex.targetLoadKg != null && ` @ ${formatKg(ex.targetLoadKg)}`}
                    </span>
                    {ex.loadChangeReason && (
                      <span className="text-[var(--color-accent)]">{ex.loadChangeReason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
