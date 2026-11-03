import { ExerciseGuideBody } from "@/components/ExerciseGuideBody"
import { Sheet, SheetHeader } from "@/components/ui/sheet"
import { formatTarget, type ProgramDay } from "@/features/schedule/utils/programDays"
import type { ScheduledExerciseView } from "@/features/schedule/types"

/** Bấm một bài ở màn Chương trình (spec §3.3): ảnh động, cơ chính, cách tập, lỗi hay gặp (doc/design-anh-dong-v1.md). */
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
        <ExerciseGuideBody
          slug={exercise.exerciseSlug}
          description={exercise.description}
          muscleGroups={exercise.muscleGroups}
          stepsVi={exercise.stepsVi}
          mistakesVi={exercise.mistakesVi}
        />
        <div className="section-title mt-5">Trong chương trình</div>
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
