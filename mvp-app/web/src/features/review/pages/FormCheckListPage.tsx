import { Link } from "react-router"
import { ExerciseImage } from "@/components/ExerciseImage"
import { StatusBadge } from "@/features/review/components/StatusBadge"
import { Stepper } from "@/components/Stepper"
import { Card } from "@/components/ui/card"
import { formatDayMonth } from "@/lib/format"
import { useExercises } from "@/features/exercise/api/useExercises"
import { useReviews } from "@/features/review/api/useReviews"

/**
 * Màn 7 concept-frontend-v1.md, lối vào chấm form (doc/design-cham-form-nguong-v1.md §5): chọn bài
 * trước, rồi bật camera cho bài đó. Bài chưa có khớp cần kiểm hiện mờ "chưa chấm được" thay vì bị
 * lọc bỏ: người dùng thấy bài mình quan tâm bị tắt thì hiểu ngay, lọc đi thì tưởng app quên.
 */
export function FormCheckListPage() {
  const exercises = useExercises()
  const reviews = useReviews()

  const active = (exercises.data ?? []).filter((e) => e.active)
  const analyzable = active.filter((e) => e.analyzable)
  const rest = active.filter((e) => !e.analyzable)
  const latest = reviews.data?.[0]

  return (
    <div>
      <Stepper label="Kiểm tra form" steps={3} current={0} />
      <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">Chấm form</h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Chọn bài, bật camera rồi tập 5 rep mỗi góc quay. Hình ảnh không rời máy bạn.
      </p>

      <section className="mt-6">
        <div className="kicker">Chọn bài để chấm</div>

        {exercises.isLoading && <p className="mt-3 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {exercises.isError && <p className="mt-3 text-sm text-[var(--color-danger)]">{exercises.error.message}</p>}

        {exercises.data && analyzable.length === 0 && (
          <Card className="mt-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Chưa có bài nào chấm form được. Quản trị viên cần thêm khớp cần kiểm cho bài.
            </p>
          </Card>
        )}

        <div className="mt-2.5 flex flex-col gap-2">
          {analyzable.map((exercise) => (
            <Link
              key={exercise.id}
              to={`/form-check/${exercise.id}/live`}
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              <ExerciseImage slug={exercise.slug} alt={exercise.nameVi ?? exercise.nameEn} variant="thumb" />
              <span className="min-w-0 flex-1 truncate text-base font-semibold">
                {exercise.nameVi ?? exercise.nameEn}
              </span>
              <span className="text-[var(--color-accent)]">→</span>
            </Link>
          ))}
          {rest.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 opacity-55"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--color-text-muted)]">
                {exercise.nameVi ?? exercise.nameEn}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">chưa chấm được</span>
            </div>
          ))}
        </div>
      </section>

      {reviews.data && reviews.data.length > 0 && (
        <section className="mt-7">
          <div className="kicker">Lần gửi gần đây</div>
          <div className="mt-2.5 flex flex-col gap-2">
            {reviews.data.map((review) => (
              <Link
                key={review.id}
                to={`/form-check/result/${review.id}`}
                className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{review.exerciseName ?? "Chưa rõ bài"}</span>
                  <span className="num block text-xs text-[var(--color-text-muted)]">
                    {formatDayMonth(review.createdAt)}
                  </span>
                </span>
                <StatusBadge status={review.rejectReason === "UNKNOWN_EXERCISE" ? "NEEDS_EXERCISE" : review.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {latest && (
        <p className="num mt-5 text-[11px] text-[var(--color-text-muted)]">
          Lần chấm gần nhất: {latest.exerciseName ?? "chưa rõ bài"}, {formatDayMonth(latest.createdAt)}.
        </p>
      )}
    </div>
  )
}
