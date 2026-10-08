import { Link } from "react-router"
import { Dumbbell } from "lucide-react"
import { ExerciseImage } from "@/components/ExerciseImage"
import { Section } from "@/features/review/components/Section"
import { StatusBadge } from "@/features/review/components/StatusBadge"
import { Stepper } from "@/components/Stepper"
import { Skeleton } from "@/components/ui/skeleton"
import { IconText, StatusBlock } from "@/components/StatusViews"
import { formatDayMonth } from "@/lib/format"
import { useExercises } from "@/features/exercise/api/useExercises"
import { useReviews } from "@/features/review/api/useReviews"

/**
 * Màn 7 concept-frontend-v1.md, lối vào chấm form (doc/design-cham-form-nguong-v1.md §5): chọn bài
 * trước, rồi bật camera cho bài đó. Chỉ liệt kê bài chấm được: người dùng chốt 10-06 bỏ danh sách
 * bài mờ "chưa chấm được" vì làm trang dài mà không bấm được gì.
 */
export function FormCheckListPage() {
  const exercises = useExercises()
  const reviews = useReviews()

  const analyzable = (exercises.data ?? []).filter((e) => e.active && e.analyzable)
  const latest = reviews.data?.[0]

  return (
    <div>
      <Stepper label="Kiểm tra form" steps={3} current={0} />
      <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">Chấm form</h1>
      <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Chọn bài, bật camera rồi tập 5 rep mỗi góc quay. Hình ảnh không rời máy bạn.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {exercises.isLoading && (
          // Khung của thẻ "Chọn bài để chấm": dòng tiêu đề rồi các dòng bài.
          <div role="status" aria-label="Đang tải" className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-3.5 pb-3">
            <Skeleton className="my-4.5 h-4 w-40" />
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[68px]" />
              ))}
            </div>
          </div>
        )}
        {exercises.isError && <IconText>{exercises.error.message}</IconText>}

        {/* Thẻ gập thay cho một danh sách dài: thẻ chọn bài mở sẵn vì đó là việc người dùng đến đây để
            làm; lịch sử ít khi cần nên nằm sau một lần bấm. */}
        {exercises.data && (
          <Section title="Chọn bài để chấm" meta={String(analyzable.length)} open>
            <div className="flex flex-col gap-1.5">
              {analyzable.length === 0 && (
                <StatusBlock
                  icon={Dumbbell}
                  title="Chưa có bài chấm form được"
                  detail="Quản trị viên cần thêm khớp cần kiểm cho bài."
                  className="py-5"
                />
              )}
              {analyzable.map((exercise) => (
                <Link
                  key={exercise.id}
                  to={`/form-check/${exercise.id}/live`}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <ExerciseImage slug={exercise.slug} alt={exercise.nameVi ?? exercise.nameEn} variant="thumb" />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {exercise.nameVi ?? exercise.nameEn}
                  </span>
                  <span className="text-[var(--color-accent)]">→</span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {reviews.data && reviews.data.length > 0 && (
          <Section title="Lần gửi gần đây" meta={String(reviews.data.length)}>
            <div className="flex flex-col gap-1.5">
              {reviews.data.map((review) => (
                <Link
                  key={review.id}
                  to={`/form-check/result/${review.id}`}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
          </Section>
        )}
      </div>

      {latest && (
        <p className="num mt-5 text-[11px] text-[var(--color-text-muted)]">
          Lần chấm gần nhất: {latest.exerciseName ?? "chưa rõ bài"}, {formatDayMonth(latest.createdAt)}.
        </p>
      )}
    </div>
  )
}
