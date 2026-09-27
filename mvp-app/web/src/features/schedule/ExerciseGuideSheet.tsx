import { ExerciseImage } from "@/components/ExerciseImage"
import { Sheet, SheetHeader } from "@/components/ui/sheet"
import { formatTarget, type ProgramDay } from "./programDays"
import type { ScheduledExerciseView } from "./types"

/** Bấm một bài ở màn Chương trình (spec §3.3). Phần 2 thay ảnh bằng hình 3D ở đây. */
export function ExerciseGuideSheet({
  exercise,
  days,
  open,
  onClose,
}: {
  exercise: ScheduledExerciseView
  days: ProgramDay[]
  open: boolean
  onClose: () => void
}) {
  const usedIn = days.flatMap((d) =>
    d.exercises.filter((e) => e.exerciseId === exercise.exerciseId).map((e) => ({ label: d.label, target: formatTarget(e) })),
  )
  return (
    <Sheet open={open} onClose={onClose} label={exercise.exerciseName}>
      <SheetHeader title={exercise.exerciseName} onCancel={onClose} />
      <div className="overflow-y-auto px-4 pb-7">
        <ExerciseImage slug={exercise.exerciseSlug} alt={exercise.exerciseName} variant="large" />
        {exercise.description && <p className="mt-3.5 text-sm leading-relaxed">{exercise.description}</p>}
        <div className="kicker mt-5">Trong chương trình</div>
        <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3">
          {usedIn.map((u) => (
            <div key={u.label} className="flex justify-between border-t border-[var(--color-border)] py-2 text-[13px] first:border-t-0">
              <span>Buổi {u.label}</span>
              <span className="num text-[var(--color-text-muted)]">{u.target}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
