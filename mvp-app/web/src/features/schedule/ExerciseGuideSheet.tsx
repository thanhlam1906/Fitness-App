import { ExerciseImage } from "@/components/ExerciseImage"
import { Sheet, SheetHeader } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import { formatTarget, type ProgramDay } from "./programDays"
import type { ScheduledExerciseView } from "./types"

// Mã nhóm cơ trong bảng exercises (muscle_groups) → chữ hiện cho người dùng.
const MUSCLE_VI: Record<string, string> = {
  QUADS: "Đùi trước",
  HAMSTRINGS: "Đùi sau",
  GLUTES: "Mông",
  CORE: "Bụng",
  LOWER_BACK: "Lưng dưới",
  UPPER_BACK: "Lưng trên",
  LATS: "Xô",
  CHEST: "Ngực",
  SHOULDERS: "Vai",
  TRICEPS: "Tay sau",
  BICEPS: "Tay trước",
}

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
        <ExerciseImage slug={exercise.exerciseSlug} alt={exercise.exerciseName} variant="large" />
        {exercise.description && <p className="mt-3.5 text-sm leading-relaxed">{exercise.description}</p>}

        {exercise.muscleGroups.length > 0 && (
          <>
            <div className="kicker mt-5">Cơ chính</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.muscleGroups.map((code, i) => (
                <span
                  key={code}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    i === 0
                      ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                  )}
                >
                  {MUSCLE_VI[code] ?? code}
                </span>
              ))}
            </div>
          </>
        )}

        {exercise.stepsVi.length > 0 && (
          <>
            <div className="kicker mt-5">Cách tập</div>
            <ol className="mt-1.5">
              {exercise.stepsVi.map((step, i) => (
                <li key={step} className="flex gap-2.5 py-1.5 text-sm leading-relaxed">
                  <span className="num mt-0.5 grid size-5.5 flex-none place-items-center rounded-full bg-[var(--color-surface-2)] text-xs font-extrabold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </>
        )}

        {exercise.mistakesVi.length > 0 && (
          <>
            <div className="kicker mt-5">Lỗi hay gặp</div>
            <ul className="mt-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[var(--color-warn-tint)] px-3 py-1">
              {exercise.mistakesVi.map((m) => (
                <li key={m} className="flex gap-2 py-1.5 text-[13px] leading-relaxed">
                  <span aria-hidden className="font-extrabold text-[var(--color-warn)]">
                    !
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          </>
        )}
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
