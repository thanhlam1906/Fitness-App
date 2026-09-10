import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { StatusBadge } from "@/components/StatusBadge"
import { Stepper } from "@/components/Stepper"
import { Card } from "@/components/ui/card"
import { formatDayMonth } from "@/lib/format"
import type { Exercise } from "./types"
import { useReviews } from "./useReviews"

/**
 * Màn 7 concept-frontend-v1.md — chọn bài muốn kiểm tra form.
 *
 * Design hiện CẢ bài chưa chấm được, ở dạng mờ kèm chữ "chưa chấm được", thay
 * vì lọc bỏ: người dùng thấy bài mình quan tâm chưa có ngưỡng thì hiểu ngay,
 * còn lọc đi thì họ tưởng app quên mất bài đó.
 */
export function FormCheckListPage() {
  const exercises = useQuery({
    queryKey: ["exercises"],
    queryFn: () => api.get<Exercise[]>("/exercises"),
  })
  const reviews = useReviews()

  const active = (exercises.data ?? []).filter((e) => e.active)
  // Bật analyzable nhưng chưa đặt ngưỡng thì gửi clip lên cũng không chấm được gì.
  const analyzable = active.filter((e) => e.analyzable && e.formCheckCount > 0)
  const rest = active.filter((e) => !e.analyzable || e.formCheckCount === 0)
  const latest = reviews.data?.[0]

  return (
    <div>
      <Stepper label="Kiểm tra form" steps={3} current={0} />
      <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">Chấm bài nào?</h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Chỉ chấm được những bài đã có ngưỡng do huấn luyện viên đặt. Các bài khác vẫn tập bình
        thường. Không có người xem clip của bạn.
      </p>

      {exercises.isLoading && (
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">Đang tải…</p>
      )}
      {exercises.isError && (
        <p className="mt-5 text-sm text-[var(--color-danger)]">{exercises.error.message}</p>
      )}

      {exercises.data && analyzable.length === 0 && (
        <Card className="mt-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Chưa có bài nào hỗ trợ chấm form. Quản trị viên cần bật `analyzable` và cấu hình các
            check cho bài đó.
          </p>
        </Card>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {analyzable.map((exercise) => (
          <Link
            key={exercise.id}
            to={`/form-check/${exercise.id}`}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4"
          >
            <span className="min-w-0 flex-1 truncate text-base font-semibold">
              {exercise.nameVi ?? exercise.nameEn}
            </span>
            <span className="num rounded-full bg-[var(--color-accent-tint)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              {exercise.formCheckCount} mục kiểm
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
                  <span className="block truncate text-sm">{review.exerciseName ?? "—"}</span>
                  <span className="num block text-xs text-[var(--color-text-muted)]">
                    {formatDayMonth(review.createdAt)}
                  </span>
                </span>
                <StatusBadge status={review.status === "DONE" ? "DONE" : review.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {latest && (
        <p className="num mt-5 text-[11px] text-[var(--color-text-muted)]">
          Lần chấm gần nhất: {latest.exerciseName ?? "—"}, {formatDayMonth(latest.createdAt)}.
        </p>
      )}
    </div>
  )
}
