import { useState } from "react"
import { Link } from "react-router"
import { ChevronRight, Dumbbell } from "lucide-react"
import { ExerciseImage } from "@/components/ExerciseImage"
import { ExerciseSearch, NoMatch } from "@/components/ExerciseSearch"
import { Section } from "@/features/review/components/Section"
import { StatusBadge } from "@/features/review/components/StatusBadge"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { IconText, StatusBlock } from "@/components/StatusViews"
import { cn } from "@/lib/cn"
import { filterExercises } from "@/lib/exerciseFilter"
import { formatDayMonth } from "@/lib/format"
import { useExercises } from "@/features/exercise/api/useExercises"
import { useReviews } from "@/features/review/api/useReviews"

// ponytail: ngưỡng cố định; dưới mức này danh sách ngắn nhìn là thấy, ô tìm chỉ thêm chữ.
const SEARCH_FROM = 8

/**
 * Lối vào chấm form (doc/design-cham-form-nguong-v1.md §5): chọn bài trước, rồi bật camera cho bài
 * đó. Chỉ liệt kê bài chấm được (người dùng chốt 10-06). Ô tìm và chip nhóm cơ cho danh sách dài
 * (doc/design-gon-giao-dien-user-v1.md §6).
 */
export function FormCheckListPage() {
  const exercises = useExercises()
  const reviews = useReviews()
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)

  // API trả không theo thứ tự nào (findAll không ORDER BY): sắp theo tên để bài không nhảy chỗ.
  const analyzable = (exercises.data ?? [])
    .filter((e) => e.active && e.analyzable)
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
  const searchable = analyzable.length >= SEARCH_FROM
  const visible = searchable ? filterExercises(analyzable, query, muscle) : analyzable

  return (
    <div>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Chấm form</h1>

      {exercises.isLoading && (
        <div role="status" aria-label="Đang tải" className="mt-5 flex flex-col gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      )}
      {exercises.isError && <IconText className="mt-5">{exercises.error.message}</IconText>}
      {exercises.data && analyzable.length === 0 && (
        <StatusBlock icon={Dumbbell} title="Chưa có bài chấm form được" className="mt-5" />
      )}

      {searchable && (
        <ExerciseSearch
          className="mt-5"
          exercises={analyzable}
          query={query}
          muscle={muscle}
          onQuery={setQuery}
          onMuscle={setMuscle}
        />
      )}
      {analyzable.length > 0 && (
        <div className={cn("flex flex-col gap-1.5", searchable ? "mt-3" : "mt-5")}>
          {visible.length === 0 && (
            <NoMatch
              onClear={() => {
                setQuery("")
                setMuscle(null)
              }}
            />
          )}
          {visible.map((exercise) => (
            <Link
              key={exercise.id}
              to={`/form-check/${exercise.id}/live`}
              className={cn("flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3", SHEET_FOCUS)}
            >
              <ExerciseImage slug={exercise.slug} alt="" variant="thumb" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{exercise.nameEn}</span>
                {/* Tìm "day nguc" mà ra Bench Press: thấy tên Việt mới hiểu vì sao khớp. */}
                {exercise.nameVi && (
                  <span className="block truncate text-[13px] text-[var(--color-text-muted)]">{exercise.nameVi}</span>
                )}
              </span>
              <ChevronRight className="size-4.5 flex-none text-[var(--color-text-muted)]" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      {reviews.isError && <IconText className="mt-5">{reviews.error.message}</IconText>}
      {reviews.data && reviews.data.length > 0 && (
        <div className="mt-6">
          <Section title="Lần gửi gần đây" meta={String(reviews.data.length)}>
            <div className="flex flex-col gap-1.5">
              {reviews.data.map((review) => (
                <Link
                  key={review.id}
                  to={`/form-check/result/${review.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3.5 py-3",
                    SHEET_FOCUS,
                  )}
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
        </div>
      )}
    </div>
  )
}
