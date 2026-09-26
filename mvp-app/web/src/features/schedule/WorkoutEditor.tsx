import { useState } from "react"
import { X } from "lucide-react"
import { Sheet, SHEET_FOCUS, SheetHeader } from "@/components/ui/sheet"
import { useExercises } from "@/features/admin/exercises/useExercises"
import { cn } from "@/lib/cn"
import { formatDayMonth } from "@/lib/format"
import { diffDraft, nudge, toDraft, type DraftRow } from "./editDraft"
import type { ScheduledWorkoutView } from "./types"
import {
  useAddScheduledExercise,
  useRemoveScheduledExercise,
  useUpdateScheduledExercise,
} from "./useEditSchedule"

/**
 * Khung "Sửa buổi này" của màn Lịch (doc/design-ui-m3-v1.md §3). Sửa ĐÚNG buổi này:
 * backend chỉ đổi dòng scheduled_exercises của buổi đang mở, các buổi khác giữ
 * nguyên. Mở cho buổi PLANNED; buổi đã tập backend trả 409.
 */
export function WorkoutEditSheet({
  workout,
  open,
  onClose,
}: {
  workout: ScheduledWorkoutView
  open: boolean
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  return (
    <Sheet open={open} onClose={onClose} label={`Sửa buổi ${workout.label ?? ""}`} dismissible={!saving}>
      {/* Thân khung mount lại mỗi lần mở (Sheet chỉ render con khi đã mở): nháp luôn bắt đầu từ lịch hiện tại. */}
      <EditBody workout={workout} onClose={onClose} saving={saving} setSaving={setSaving} />
    </Sheet>
  )
}

function EditBody({
  workout,
  onClose,
  saving,
  setSaving,
}: {
  workout: ScheduledWorkoutView
  onClose: () => void
  saving: boolean
  setSaving: (saving: boolean) => void
}) {
  const exercises = useExercises()
  const update = useUpdateScheduledExercise()
  const add = useAddScheduledExercise()
  const remove = useRemoveScheduledExercise()
  const [rows, setRows] = useState<DraftRow[]>(() => toDraft(workout.exercises))
  const [error, setError] = useState<string | null>(null)

  const changes = diffDraft(workout.exercises, rows)
  const dirty = changes.updates.length + changes.adds.length + changes.removes.length > 0
  // Không cho thêm bài đã có trong buổi: set_logs khoá theo (buổi, bài, số set), hai dòng
  // cùng bài sẽ đè set của nhau khi tập.
  const taken = new Set(rows.filter((r) => !r.removed).map((r) => r.exerciseId))
  const active = exercises.data?.filter((e) => e.active && !taken.has(e.id)) ?? []

  function patch(key: string, fn: (row: DraftRow) => DraftRow) {
    setRows((prev) => prev.map((r) => (r.key === key ? fn(r) : r)))
  }

  // Gọi lần lượt để bài thêm vào giữ đúng thứ tự. Mỗi bước xong thì ghi vào nháp, để lỗi
  // giữa chừng rồi bấm Lưu lại không xoá lại bài đã xoá hay thêm trùng bài đã thêm.
  async function save() {
    setSaving(true)
    setError(null)
    try {
      for (const id of changes.removes) {
        await remove.mutateAsync(id)
        setRows((prev) => prev.filter((r) => r.id !== id))
      }
      for (const r of changes.updates) {
        await update.mutateAsync({
          id: r.id!,
          targetSets: r.sets,
          targetReps: r.reps,
          targetRepsMax: r.repsMax,
          targetLoadKg: r.loadKg,
          restSeconds: r.restSeconds,
        })
      }
      for (const r of changes.adds) {
        const created = await add.mutateAsync({
          workoutId: workout.id,
          exerciseId: r.exerciseId,
          targetSets: r.sets,
          targetReps: r.reps,
          targetRepsMax: r.repsMax,
          targetLoadKg: r.loadKg,
          restSeconds: null,
        })
        setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, id: (created as { id: string }).id } : x)))
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SheetHeader
        title={`Sửa buổi ${workout.label ?? ""}`}
        confirmLabel={saving ? "Đang lưu…" : "Lưu"}
        confirmDisabled={!dirty || saving}
        onCancel={() => !saving && onClose()}
        onConfirm={save}
      />
      <p className="num flex-none px-4 pb-2.5 text-center text-xs text-[var(--color-text-muted)]">
        {formatDayMonth(workout.scheduledOn)} · chỉ đổi buổi này, các buổi khác giữ nguyên
      </p>
      <div className="overflow-y-auto px-4 pb-7">
        {rows
          .filter((r) => !r.removed)
          .map((r) => (
            <div key={r.key} className="mt-2.5 rounded-[var(--radius-lg)] bg-[var(--color-bg)] p-3 first:mt-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold">{r.name}</span>
                <button
                  type="button"
                  aria-label={`Xoá ${r.name} khỏi buổi này`}
                  onClick={() => patch(r.key, (row) => ({ ...row, removed: true }))}
                  className={cn(
                    "grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                    SHEET_FOCUS,
                  )}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Stepper label="Set" value={String(r.sets)} onStep={(d) => patch(r.key, (row) => nudge(row, "sets", d))} />
                <Stepper
                  label="Tạ (kg)"
                  value={r.loadKg === null ? "—" : String(r.loadKg).replace(".", ",")}
                  onStep={(d) => patch(r.key, (row) => nudge(row, "loadKg", d))}
                />
                <Stepper label="Rep từ" value={String(r.reps)} onStep={(d) => patch(r.key, (row) => nudge(row, "reps", d))} />
                <Stepper
                  label="Rep đến"
                  value={String(r.repsMax)}
                  onStep={(d) => patch(r.key, (row) => nudge(row, "repsMax", d))}
                />
              </div>
            </div>
          ))}

        {active.length > 0 && (
          <select
            aria-label="Thêm bài vào buổi này"
            value=""
            onChange={(e) => {
              const picked = active.find((x) => x.id === e.target.value)
              if (!picked) return
              setRows((prev) => [
                ...prev,
                {
                  key: `new-${picked.id}-${prev.length}`,
                  id: null,
                  exerciseId: picked.id,
                  name: picked.nameVi ?? picked.nameEn,
                  sets: 3,
                  reps: 8,
                  repsMax: 12,
                  loadKg: null,
                  restSeconds: null,
                  removed: false,
                },
              ])
            }}
            className={cn(
              "mt-3 h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--color-border)] bg-transparent text-center text-sm font-semibold text-[var(--color-text-muted)]",
              SHEET_FOCUS,
            )}
          >
            <option value="">+ Thêm bài vào buổi này</option>
            {active.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nameVi ?? option.nameEn}
              </option>
            ))}
          </select>
        )}

        <p className="mt-3 text-xs text-[var(--color-text-muted)]">Tạ mỗi lần bấm đổi 2,5 kg.</p>
        {error && <p className="mt-2 text-sm text-[var(--color-danger)]">Lưu thất bại: {error}</p>}
      </div>
    </>
  )
}

function Stepper({
  label,
  value,
  onStep,
}: {
  label: string
  value: string
  onStep: (dir: 1 | -1) => void
}) {
  const button = cn(
    "grid size-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-lg font-bold",
    SHEET_FOCUS,
  )
  return (
    <div>
      <div className="mb-1 text-[11px] text-[var(--color-text-muted)]">{label}</div>
      <div className="flex h-10 items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1">
        <button type="button" aria-label={`Giảm ${label}`} className={button} onClick={() => onStep(-1)}>
          −
        </button>
        <span className="num text-[15px] font-extrabold" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`Tăng ${label}`} className={button} onClick={() => onStep(1)}>
          +
        </button>
      </div>
    </div>
  )
}
