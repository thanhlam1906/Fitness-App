import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useExercises } from "./useExercises"

/** concept-frontend-v1.md màn 12 — CRUD ~40 bài. */
export function ExerciseListPage() {
  const exercises = useExercises()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bài tập</h1>
        <Link to="/admin/exercises/new">
          <Button>+ Thêm bài</Button>
        </Link>
      </div>

      {exercises.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
      {exercises.isError && (
        <p className="text-sm text-[var(--color-danger)]">{exercises.error.message}</p>
      )}

      <div className="space-y-2">
        {exercises.data?.map((ex) => (
          <Link key={ex.id} to={`/admin/exercises/${ex.id}`}>
            <Card className="flex items-center justify-between hover:border-[var(--color-accent)]">
              <div>
                <p className="text-sm font-medium">
                  {ex.nameEn}
                  {ex.nameVi && <span className="text-[var(--color-text-muted)]"> · {ex.nameVi}</span>}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {ex.slug} · {ex.equipment.join(", ") || "bodyweight"}
                  {ex.analyzable && " · chấm form được"}
                </p>
              </div>
              {!ex.active && (
                <span className="text-xs text-[var(--color-text-muted)]">đã tắt</span>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
