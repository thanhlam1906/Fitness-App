import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { useLogSet } from "./useWorkoutSession"

const SKIP_REASONS = [
  { value: "TIRED", label: "Mệt" },
  { value: "NO_EQUIPMENT", label: "Thiếu thiết bị" },
  { value: "PAIN", label: "Đau" },
  { value: "OTHER", label: "Khác" },
] as const

/** §5.2/5.3 concept-frontend-v1.md — log rep/tải từng set, RPE hỏi mềm ở set cuối bài, nút bỏ set kèm lý do. */
export function ExerciseLogger({ exercise, sessionId }: { exercise: ScheduledExerciseView; sessionId: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {exercise.exerciseName}
        <span className="text-[var(--color-text-muted)]">
          {" "}
          · {exercise.targetSets}×{exercise.targetReps}
          {exercise.targetLoadKg != null && ` @ ${exercise.targetLoadKg} kg`}
        </span>
      </p>
      <div className="space-y-2">
        {Array.from({ length: exercise.targetSets }, (_, i) => i + 1).map((setIndex) => (
          <SetRow
            key={setIndex}
            sessionId={sessionId}
            exerciseId={exercise.id}
            setIndex={setIndex}
            isLastSet={setIndex === exercise.targetSets}
            targetReps={exercise.targetReps}
            defaultLoadKg={exercise.targetLoadKg}
          />
        ))}
      </div>
    </div>
  )
}

function SetRow({
  sessionId,
  exerciseId,
  setIndex,
  isLastSet,
  targetReps,
  defaultLoadKg,
}: {
  sessionId: string
  exerciseId: string
  setIndex: number
  isLastSet: boolean
  targetReps: number
  defaultLoadKg: number | null
}) {
  const logSet = useLogSet(sessionId)
  const [reps, setReps] = useState(targetReps)
  const [loadKg, setLoadKg] = useState(defaultLoadKg ?? 0)
  const [rpe, setRpe] = useState<number | "">("")
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState<string>("TIRED")

  function save() {
    logSet.mutate({
      exerciseId,
      setIndex,
      targetReps,
      reps: skipping ? null : reps,
      loadKg: skipping ? null : loadKg,
      rpe: isLastSet && rpe !== "" ? rpe : null,
      skipped: skipping,
      skipReason: skipping ? skipReason : null,
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2">
      <span className="num w-6 text-xs text-[var(--color-text-muted)]">#{setIndex}</span>

      {skipping ? (
        <select
          className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-sm"
          value={skipReason}
          onChange={(e) => setSkipReason(e.target.value)}
        >
          {SKIP_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          <div className="space-y-0.5">
            <Label htmlFor={`reps-${exerciseId}-${setIndex}`}>Rep</Label>
            <Input
              id={`reps-${exerciseId}-${setIndex}`}
              type="number"
              className="num w-16"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
            />
          </div>
          <div className="space-y-0.5">
            <Label htmlFor={`load-${exerciseId}-${setIndex}`}>kg</Label>
            <Input
              id={`load-${exerciseId}-${setIndex}`}
              type="number"
              step="0.5"
              className="num w-20"
              value={loadKg}
              onChange={(e) => setLoadKg(Number(e.target.value))}
            />
          </div>
          {isLastSet && (
            <div className="space-y-0.5">
              <Label htmlFor={`rpe-${exerciseId}-${setIndex}`}>RPE</Label>
              <Input
                id={`rpe-${exerciseId}-${setIndex}`}
                type="number"
                min={1}
                max={10}
                className="num w-16"
                placeholder="tuỳ chọn"
                value={rpe}
                onChange={(e) => setRpe(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          )}
        </>
      )}

      <Button type="button" variant="secondary" onClick={() => setSkipping((s) => !s)}>
        {skipping ? "Không bỏ nữa" : "Bỏ set"}
      </Button>
      <Button type="button" onClick={save} disabled={logSet.isPending}>
        {logSet.isPending ? "Đang lưu…" : logSet.isSuccess ? "Đã lưu ✓" : "Lưu"}
      </Button>
      {logSet.isError && <span className="text-xs text-[var(--color-danger)]">{logSet.error.message}</span>}
    </div>
  )
}
