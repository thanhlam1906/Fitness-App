import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useExercises } from "@/features/admin/exercises/useExercises"
import { formatDayMonth } from "@/lib/format"
import type { ScheduledExerciseView, ScheduledWorkoutView } from "./types"
import {
  useAddScheduledExercise,
  useRemoveScheduledExercise,
  useUpdateScheduledExercise,
} from "./useEditSchedule"

/**
 * Sửa ĐÚNG buổi này: backend chỉ đổi dòng scheduled_exercises của buổi đang mở,
 * các buổi khác giữ nguyên. Buổi đã tập xong không sửa được (backend trả 409).
 */
export function WorkoutEditor({ workout }: { workout: ScheduledWorkoutView }) {
  const exercises = useExercises()
  const add = useAddScheduledExercise()
  const remove = useRemoveScheduledExercise()
  const editable = workout.status === "PLANNED"
  const active = exercises.data?.filter((e) => e.active) ?? []

  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold">
          {formatDayMonth(workout.scheduledOn)} · Buổi {workout.label ?? ""}
        </span>
        {!editable && (
          <span className="text-[11px] text-[var(--color-text-muted)]">Đã tập, không sửa được</span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {workout.exercises.map((exercise) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            editable={editable}
            onRemove={() => remove.mutate(exercise.id)}
          />
        ))}
      </div>

      {editable && active.length > 0 && (
        <div className="mt-3 flex gap-2 border-t border-[var(--color-border)] pt-3">
          <select
            aria-label="Bài tập muốn thêm"
            className="flex-1 rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return
              add.mutate({
                workoutId: workout.id,
                exerciseId: e.target.value,
                targetSets: 3,
                targetReps: 8,
                targetRepsMax: 12,
                targetLoadKg: null,
                restSeconds: null,
              })
              e.target.value = ""
            }}
          >
            <option value="">+ Thêm bài tập…</option>
            {active.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nameVi ?? option.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}

      {(add.isError || remove.isError) && (
        <p className="mt-2 text-xs text-[var(--color-danger)]">
          {(add.error ?? remove.error)!.message}
        </p>
      )}
    </div>
  )
}

function ExerciseRow({
  exercise,
  editable,
  onRemove,
}: {
  exercise: ScheduledExerciseView
  editable: boolean
  onRemove: () => void
}) {
  const update = useUpdateScheduledExercise()
  const [sets, setSets] = useState(String(exercise.targetSets))
  const [repsMin, setRepsMin] = useState(String(exercise.targetReps))
  const [repsMax, setRepsMax] = useState(String(exercise.targetRepsMax))
  const [loadKg, setLoadKg] = useState(
    exercise.targetLoadKg === null ? "" : String(exercise.targetLoadKg),
  )

  const dirty =
    sets !== String(exercise.targetSets) ||
    repsMin !== String(exercise.targetReps) ||
    repsMax !== String(exercise.targetRepsMax) ||
    loadKg !== (exercise.targetLoadKg === null ? "" : String(exercise.targetLoadKg))

  return (
    <div className="space-y-2 border-t border-[var(--color-border)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{exercise.exerciseName}</span>
        {editable && (
          <button type="button" className="text-xs text-[var(--color-danger)]" onClick={onRemove}>
            Xoá
          </button>
        )}
      </div>

      {editable ? (
        <>
          <div className="flex gap-2">
            <Field label="Set" value={sets} onChange={setSets} />
            <Field label="Rep từ" value={repsMin} onChange={setRepsMin} />
            <Field label="Rep đến" value={repsMax} onChange={setRepsMax} />
            <Field label="Tạ (kg)" value={loadKg} onChange={setLoadKg} />
          </div>
          {dirty && (
            <Button
              variant="secondary"
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: exercise.id,
                  targetSets: Number(sets),
                  targetReps: Number(repsMin),
                  targetRepsMax: Number(repsMax),
                  // Bỏ trống là "chưa biết tải", không phải 0kg.
                  targetLoadKg: loadKg === "" ? null : Number(loadKg),
                  restSeconds: exercise.restSeconds,
                })
              }
            >
              {update.isPending ? "Đang lưu…" : "Lưu bài này"}
            </Button>
          )}
          {update.isError && (
            <p className="text-xs text-[var(--color-danger)]">{update.error.message}</p>
          )}
        </>
      ) : (
        <p className="num text-xs text-[var(--color-text-muted)]">
          {exercise.targetSets}×{exercise.targetReps}
          {exercise.targetRepsMax > exercise.targetReps ? `–${exercise.targetRepsMax}` : ""}
          {exercise.targetLoadKg === null ? "" : ` · ${exercise.targetLoadKg}kg`}
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex-1 space-y-1">
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
      <Input
        type="number"
        min={0}
        className="num"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
