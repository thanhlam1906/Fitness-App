import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { ExerciseImage } from "@/components/ExerciseImage"
import { StatusBadge } from "@/components/StatusBadge"
import { Stepper } from "@/components/Stepper"
import { Card } from "@/components/ui/card"
import { formatDayMonth } from "@/lib/format"
import type { Exercise } from "./types"
import { useReviews } from "./useReviews"

/**
 * Màn 7 concept-frontend-v1.md, thành lối vào của chấm form (design-cham-form-llm-v1.md §3.1):
 * camera trực tiếp là đường chính, gửi clip đã quay là đường phụ.
 *
 * Design hiện CẢ bài chưa chấm được, ở dạng mờ kèm chữ "chưa chấm được", thay vì lọc bỏ:
 * người dùng thấy bài mình quan tâm bị tắt thì hiểu ngay, còn lọc đi thì họ tưởng app quên
 * mất bài đó.
 */
export function FormCheckListPage() {
  const exercises = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api.get<Exercise[]>("/exercises"),
  })
  const reviews = useReviews()

  const active = (exercises.data ?? []).filter((e) => e.active)
  // LLM chấm mọi bài bật analyzable, không cần ngưỡng theo bài (form_checks).
  const analyzable = active.filter((e) => e.analyzable)
  const rest = active.filter((e) => !e.analyzable)
  const latest = reviews.data?.[0]

  return (
    <div>
      <Stepper label="Kiểm tra form" steps={3} current={0} />
      <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">Chấm form</h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Bật camera, tập 5 rep góc ngang rồi 5 rep chính diện. AI nhận diện bài và chấm kỹ thuật. Hình ảnh không rời
        máy bạn.
      </p>

      <Link
        to="/form-check/live"
        className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-base font-bold text-[var(--color-accent-fg)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        Bật camera, tập và chấm
      </Link>

      <section className="mt-7">
        <div className="kicker">Đã quay sẵn? Chọn bài rồi gửi clip</div>

        {exercises.isLoading && <p className="mt-3 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {exercises.isError && <p className="mt-3 text-sm text-[var(--color-danger)]">{exercises.error.message}</p>}

        {exercises.data && analyzable.length === 0 && (
          <Card className="mt-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Chưa có bài nào bật chấm form. Quản trị viên cần bật `analyzable` cho bài đó.
            </p>
          </Card>
        )}

        <div className="mt-2.5 flex flex-col gap-2">
          {analyzable.map((exercise) => (
            <Link
              key={exercise.id}
              to={`/form-check/${exercise.id}`}
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4"
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
