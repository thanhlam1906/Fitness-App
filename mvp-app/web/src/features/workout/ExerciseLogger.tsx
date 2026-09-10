import { useState } from "react"
import { LoadDeltaBadge } from "@/components/LoadDeltaBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { SKIP_REASONS, type SetLogResponse } from "./types"
import { useLogSet, useSubstitute, useSubstitutes } from "./useWorkoutSession"

/**
 * §5.3 ke-hoach-chi-tiet-chuc-nang-v1.md — log rep/tải từng set, RPE hỏi mềm ở
 * set cuối bài, nút bỏ set kèm lý do, và thay bài khi thiếu thiết bị (§5.5).
 *
 * §3.4 concept-frontend-v1.md: SỐ TẢI là nội dung chính của màn này, không phải
 * nhãn. Design đẩy nó lên 64px — to gấp đôi mọi thứ quanh nó, liếc một cái là
 * thấy khi đang cầm tạ.
 *
 * Chỉ set đang làm mới mở ra thành thẻ có nút bấm; set đã xong và set chưa tới
 * thu lại thành một dòng. Giữa buổi chỉ có một việc phải làm.
 */
export function ExerciseLogger({
  exercise,
  scheduledWorkoutId,
  sessionId,
  loggedSets,
}: {
  exercise: ScheduledExerciseView
  scheduledWorkoutId: string
  sessionId: string
  loggedSets: SetLogResponse[]
}) {
  const setIndexes = Array.from({ length: exercise.targetSets }, (_, i) => i + 1)
  // Set đang làm = set đầu tiên chưa log. Xong hết thì không set nào nổi lên.
  const activeSetIndex = setIndexes.find((i) => !loggedSets.some((s) => s.setIndex === i))

  return (
    <div>
      <div className="mt-5 text-[22px] font-bold">{exercise.exerciseName}</div>
      {exercise.substitutedFromName && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          thay cho {exercise.substitutedFromName}
        </p>
      )}

      <div className="mt-1.5 flex items-end gap-2.5">
        <span className="num text-[length:var(--text-load)] leading-none font-extrabold tracking-[-0.03em]">
          {exercise.targetLoadKg == null ? "—" : formatKg(exercise.targetLoadKg).replace(" kg", "")}
        </span>
        <span className="num pb-2 text-xl font-semibold text-[var(--color-text-muted)]">
          kg × {exercise.targetReps}
          {exercise.targetRepsMax > exercise.targetReps && `–${exercise.targetRepsMax}`} rep
        </span>
      </div>

      {exercise.loadDecision && (
        <div className="mt-2 flex items-baseline gap-2">
          <LoadDeltaBadge decision={exercise.loadDecision} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {exercise.loadDecision.messageVi}
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {setIndexes.map((setIndex) => {
          const logged = loggedSets.find((s) => s.setIndex === setIndex)
          return setIndex === activeSetIndex ? (
            <ActiveSet
              key={setIndex}
              scheduledWorkoutId={scheduledWorkoutId}
              sessionId={sessionId}
              exerciseId={exercise.exerciseId}
              setIndex={setIndex}
              isLastSet={setIndex === exercise.targetSets}
              targetReps={exercise.targetRepsMax}
              defaultLoadKg={exercise.targetLoadKg}
              restSeconds={exercise.restSeconds}
            />
          ) : (
            <SetSummaryRow
              key={setIndex}
              setIndex={setIndex}
              logged={logged}
              targetReps={exercise.targetReps}
              targetLoadKg={exercise.targetLoadKg}
            />
          )
        })}
      </div>

      <SubstitutePanel exercise={exercise} />
    </div>
  )
}

/** Set đã xong hoặc chưa tới — một dòng, không nút. */
function SetSummaryRow({
  setIndex,
  logged,
  targetReps,
  targetLoadKg,
}: {
  setIndex: number
  logged: SetLogResponse | undefined
  targetReps: number
  targetLoadKg: number | null
}) {
  const done = logged != null
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3 text-sm",
        !done && "text-[var(--color-text-muted)]",
      )}
    >
      <span className="w-11 text-[11px] tracking-[0.08em] text-[var(--color-text-muted)]">
        SET {setIndex}
      </span>
      <span className="num flex-1">
        {logged?.skipped
          ? `bỏ set · ${SKIP_REASONS.find((r) => r.value === logged.skipReason)?.label ?? "khác"}`
          : `${logged?.reps ?? targetReps} rep · ${formatKg(logged?.loadKg ?? targetLoadKg)}`}
      </span>
      {done ? (
        <span className="num text-[var(--color-success)]">
          {logged!.rpe != null ? `RPE ${logged!.rpe} ` : ""}✓
        </span>
      ) : (
        <span>—</span>
      )}
    </div>
  )
}

function ActiveSet({
  scheduledWorkoutId,
  sessionId,
  exerciseId,
  setIndex,
  isLastSet,
  targetReps,
  defaultLoadKg,
  restSeconds,
}: {
  scheduledWorkoutId: string
  sessionId: string
  exerciseId: string
  setIndex: number
  isLastSet: boolean
  targetReps: number
  defaultLoadKg: number | null
  restSeconds: number | null
}) {
  const logSet = useLogSet(scheduledWorkoutId, sessionId)
  const [reps, setReps] = useState(targetReps)
  const [loadKg, setLoadKg] = useState(defaultLoadKg ?? 0)
  const [rpe, setRpe] = useState<number | "">("")
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState("TIRED")

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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold tracking-[0.1em] text-[var(--color-accent)] uppercase">
          Set {setIndex} — đang làm
        </span>
        {restSeconds != null && (
          <span className="num text-xs text-[var(--color-text-muted)]">
            nghỉ {formatRest(restSeconds)}
          </span>
        )}
      </div>

      {skipping ? (
        <div className="mt-3.5">
          <label htmlFor={`skip-${exerciseId}-${setIndex}`} className="kicker">
            Lý do bỏ set
          </label>
          <select
            id={`skip-${exerciseId}-${setIndex}`}
            className="mt-1.5 h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
          >
            {SKIP_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="mt-3.5 flex gap-4.5">
            <NumberStepper
              label="Rep"
              id={`reps-${exerciseId}-${setIndex}`}
              value={reps}
              step={1}
              min={0}
              onChange={setReps}
            />
            <NumberStepper
              label="Tải (kg)"
              id={`load-${exerciseId}-${setIndex}`}
              value={loadKg}
              step={2.5}
              min={0}
              onChange={setLoadKg}
            />
          </div>
          {isLastSet && (
            /* RPE hỏi mềm: bỏ trống được, thiếu thì bài này chỉ chạy double progression */
            <div className="mt-3.5">
              <label htmlFor={`rpe-${exerciseId}-${setIndex}`} className="kicker">
                RPE set cuối — bỏ qua được
              </label>
              <input
                id={`rpe-${exerciseId}-${setIndex}`}
                type="number"
                min={1}
                max={10}
                placeholder="—"
                className="num mt-1.5 h-11 w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-base"
                value={rpe}
                onChange={(e) => setRpe(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          )}
        </>
      )}

      <Button className="mt-4 w-full" onClick={save} disabled={logSet.isPending}>
        {logSet.isPending ? "Đang lưu…" : `Lưu set ${setIndex}`}
      </Button>

      <div className="mt-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSkipping((s) => !s)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {skipping ? "Không bỏ nữa" : "Bỏ set này"}
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          lưu lên server sau mỗi set
        </span>
      </div>
      {logSet.isError && (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{logSet.error.message}</p>
      )}
    </div>
  )
}

/**
 * Nút − / + cỡ 44px cộng ô số gõ được: giữa buổi thì bấm dễ hơn gõ, nhưng tạ
 * lẻ (1,25 kg mỗi bên) vẫn phải nhập tay được.
 */
function NumberStepper({
  label,
  id,
  value,
  step,
  min,
  onChange,
}: {
  label: string
  id: string
  value: number
  step: number
  min: number
  onChange: (value: number) => void
}) {
  const button =
    "size-11 flex-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-xl hover:border-[var(--color-text-muted)]"
  return (
    <div className="flex-1">
      <label htmlFor={id} className="kicker">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          className={button}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-full min-w-0 bg-transparent text-center text-[26px] font-bold outline-none"
        />
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          className={button}
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
    </div>
  )
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = `${seconds % 60}`.padStart(2, "0")
  return `${m}:${s}`
}

/** §5.5 — người dùng báo thiếu thiết bị, hệ thống đề xuất, NGƯỜI DÙNG xác nhận rồi mới đổi. */
function SubstitutePanel({ exercise }: { exercise: ScheduledExerciseView }) {
  const [open, setOpen] = useState(false)
  const suggestions = useSubstitutes(open ? exercise.exerciseId : null)
  const substitute = useSubstitute()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        Thiếu thiết bị, đổi bài khác
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3">
      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
        Bài cùng nhóm cơ, lọc theo thiết bị bạn đang có. Set và rep giữ nguyên; tải cần nhập lại.
      </p>
      {suggestions.isLoading && <p className="text-xs text-[var(--color-text-muted)]">Đang tìm…</p>}
      {suggestions.data?.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Không có bài thay thế nào khớp thiết bị đã khai ở hồ sơ.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {suggestions.data?.map((s) => (
          <Button
            key={s.id}
            variant="secondary"
            size="sm"
            disabled={substitute.isPending}
            onClick={() =>
              substitute.mutate(
                { scheduledExerciseId: exercise.id, exerciseId: s.id },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {s.nameVi ?? s.nameEn}
          </Button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        Huỷ
      </button>
      {substitute.isError && (
        <p className="text-xs text-[var(--color-danger)]">{substitute.error.message}</p>
      )}
    </div>
  )
}
