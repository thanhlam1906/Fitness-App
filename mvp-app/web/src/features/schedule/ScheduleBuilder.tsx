import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useExercises } from "@/features/admin/exercises/useExercises"
import { WEEKDAYS } from "@/features/program/schema"
import { cn } from "@/lib/cn"
import {
  draftError,
  emptyExercise,
  toCustomProgramRequest,
  type Draft,
  type DraftExercise,
} from "./customProgram"
import { useCreateCustomProgram } from "./useCustomProgram"

/**
 * Tự thiết kế lịch: chọn thứ nào tập, mỗi thứ thêm bài và tự đặt set/rep/tạ.
 * Cấu trúc gắn với thứ trong tuần nên tuần nào cũng lặp lại y hệt — không có
 * progression tự động, người dùng đã tự quyết con số.
 */
export function ScheduleBuilder({ onCreated }: { onCreated: () => void }) {
  const exercises = useExercises()
  const createProgram = useCreateCustomProgram()

  const [draft, setDraft] = useState<Draft>({})
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [weeks, setWeeks] = useState("4")

  const active = exercises.data?.filter((e) => e.active) ?? []
  const error = draftError(draft)

  function toggleDay(day: number) {
    setDraft((prev) => {
      const next = { ...prev }
      if (day in next) {
        delete next[day]
      } else {
        next[day] = active[0] ? [emptyExercise(active[0].id)] : []
      }
      return next
    })
  }

  function patchExercise(day: number, index: number, patch: Partial<DraftExercise>) {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day].map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    }))
  }

  if (exercises.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải danh sách bài tập…</p>
  }

  return (
    <div>
      <div className="kicker">Ngày tập trong tuần</div>
      <div className="mt-2.5 flex gap-1.5">
        {WEEKDAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            aria-pressed={d.value in draft}
            onClick={() => toggleDay(d.value)}
            className={cn(
              "flex-1 rounded-lg py-3 text-center text-[13px]",
              d.value in draft
                ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {WEEKDAYS.filter((d) => d.value in draft).map((d) => (
        <div key={d.value} className="mt-5 rounded-xl bg-[var(--color-surface)] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">Buổi {d.label}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  [d.value]: [...prev[d.value], emptyExercise(active[0].id)],
                }))
              }
            >
              Thêm bài
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            {draft[d.value].map((ex, i) => (
              <div key={i} className="space-y-2 border-t border-[var(--color-border)] pt-3">
                <select
                  aria-label="Bài tập"
                  className="w-full rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm"
                  value={ex.exerciseId}
                  onChange={(e) => patchExercise(d.value, i, { exerciseId: e.target.value })}
                >
                  {active.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameVi ?? option.nameEn}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <NumberField
                    label="Set"
                    value={ex.sets}
                    onChange={(v) => patchExercise(d.value, i, { sets: v })}
                  />
                  <NumberField
                    label="Rep từ"
                    value={ex.repsMin}
                    onChange={(v) => patchExercise(d.value, i, { repsMin: v })}
                  />
                  <NumberField
                    label="Rep đến"
                    value={ex.repsMax}
                    onChange={(v) => patchExercise(d.value, i, { repsMax: v })}
                  />
                  <NumberField
                    label="Tạ (kg)"
                    value={ex.loadKg}
                    onChange={(v) => patchExercise(d.value, i, { loadKg: v })}
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--color-danger)]"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      [d.value]: prev[d.value].filter((_, index) => index !== i),
                    }))
                  }
                >
                  Xoá bài này
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-5 flex gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="customStartDate">Ngày bắt đầu</Label>
          <Input
            id="customStartDate"
            type="date"
            className="num"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="customWeeks">Số tuần</Label>
          <Input
            id="customWeeks"
            type="number"
            min={1}
            max={12}
            className="num"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[var(--color-danger)]">{error}</p>}
      {createProgram.isError && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">
          Tạo lịch thất bại: {createProgram.error.message}
        </p>
      )}

      <Button
        className="mt-5 w-full"
        disabled={!!error || createProgram.isPending}
        onClick={() =>
          createProgram.mutate(toCustomProgramRequest(draft, startDate, Number(weeks)), {
            onSuccess: onCreated,
          })
        }
      >
        {createProgram.isPending ? "Đang tạo…" : "Tạo lịch này"}
      </Button>
      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
        Lịch mới thay chương trình đang chạy. Lịch cũ được lưu lại, không mất dữ liệu buổi đã tập.
      </p>
    </div>
  )
}

function NumberField({
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
