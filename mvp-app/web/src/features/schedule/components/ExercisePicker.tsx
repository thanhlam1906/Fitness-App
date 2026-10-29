import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { ExerciseImage } from "@/components/ExerciseImage"
import { ExerciseSearch, NoMatch } from "@/components/ExerciseSearch"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import type { Exercise } from "@/features/exercise/types"
import { cn } from "@/lib/cn"
import { filterExercises } from "@/lib/exerciseFilter"

/**
 * Chọn một bài trong khung trượt (sửa buổi, tự thiết kế lịch): ô tìm không dấu và chip nhóm cơ thay cho
 * ô chọn của điện thoại xổ ra cả ~40 bài (doc/design-gon-giao-dien-user-v1.md §6).
 * Đặt trong vùng cuộn của khung: ô tìm dính đầu khi cuộn danh sách.
 */
export function ExercisePicker({
  exercises,
  onPick,
  autoFocus = false,
}: {
  exercises: Exercise[]
  onPick: (exercise: Exercise) => void
  /** Mở thành trang con trong khung: đưa focus vào ô tìm, nút vừa bấm đã unmount. */
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const sorted = [...exercises].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
  const visible = filterExercises(sorted, query, muscle)

  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] pb-2">
        <ExerciseSearch autoFocus={autoFocus} exercises={sorted} query={query} muscle={muscle} onQuery={setQuery} onMuscle={setMuscle} />
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {visible.length === 0 && (
          <NoMatch
            onClear={() => {
              setQuery("")
              setMuscle(null)
            }}
          />
        )}
        {visible.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onPick(exercise)}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg)] p-2.5 text-left",
              SHEET_FOCUS,
            )}
          >
            <ExerciseImage slug={exercise.slug} alt="" variant="thumb" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{exercise.nameEn}</span>
              {exercise.nameVi && (
                <span className="block truncate text-[13px] text-[var(--color-text-muted)]">{exercise.nameVi}</span>
              )}
            </span>
            <ChevronRight className="size-4.5 flex-none text-[var(--color-text-muted)]" aria-hidden />
          </button>
        ))}
      </div>
    </>
  )
}
