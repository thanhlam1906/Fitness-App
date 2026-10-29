import { useState } from "react"
import { ChevronDown, Plus, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SHEET_FOCUS, SheetHeader } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { ExercisePicker } from "@/features/schedule/components/ExercisePicker"
import { useExercises } from "@/features/exercise/api/useExercises"
import { WEEKDAYS } from "@/features/program/types/schema"
import { IconText, Notice } from "@/components/StatusViews"
import { cn } from "@/lib/cn"
import {
  draftError,
  emptyExercise,
  toCustomProgramRequest,
  type Draft,
  type DraftExercise,
} from "@/features/schedule/utils/customProgram"
import { useCreateCustomProgram } from "@/features/schedule/api/useCustomProgram"

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
  // Dòng đang chọn bài trong khung: index = null là thêm dòng mới cho ngày đó.
  const [picking, setPicking] = useState<{ day: number; index: number | null } | null>(null)

  const active = exercises.data?.filter((e) => e.active) ?? []
  const nameOf = (id: string) => active.find((e) => e.id === id)?.nameEn ?? "Chọn bài"
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
    // Khung của form: tiêu đề mục + 7 nút thứ, hàng ngày bắt đầu/số tuần, cảnh báo, nút tạo.
    return (
      <div role="status" aria-label="Đang tải">
        <Skeleton className="h-3 w-40" />
        <div className="mt-2.5 flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-[42px] flex-1 rounded-lg" />
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 w-28" />
        </div>
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">Ngày tập trong tuần</div>
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
        <div key={d.value} className="mt-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3.5">
          <span className="text-[15px] font-bold">Buổi {d.label}</span>

          <div className="mt-3 space-y-3">
            {draft[d.value].map((ex, i) => (
              <div key={i} className="space-y-2 border-t border-[var(--color-border)] pt-3">
                <button
                  type="button"
                  aria-label={`Bài tập: ${nameOf(ex.exerciseId)}. Bấm để đổi`}
                  onClick={() => setPicking({ day: d.value, index: i })}
                  className={cn(
                    "flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 text-left text-[15px] font-semibold",
                    SHEET_FOCUS,
                  )}
                >
                  <span className="truncate">{nameOf(ex.exerciseId)}</span>
                  <ChevronDown className="size-4.5 flex-none text-[var(--color-text-muted)]" aria-hidden />
                </button>
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
                  className={cn("-my-2 min-h-11 rounded-[var(--radius-sm)] text-xs text-[var(--color-danger)]", SHEET_FOCUS)}
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
          <button
            type="button"
            onClick={() => setPicking({ day: d.value, index: null })}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[var(--color-border)] text-sm font-bold",
              SHEET_FOCUS,
            )}
          >
            <Plus className="size-4" aria-hidden />
            Thêm bài
          </button>
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

      {error && <IconText className="mt-3 text-xs">{error}</IconText>}
      {createProgram.isError && (
        <IconText className="mt-3">Tạo lịch thất bại: {createProgram.error.message}</IconText>
      )}

      {/* Người dùng chốt viết ngắn (09-26): chỉ hai điều cần biết trước khi bấm. */}
      <Notice icon={TriangleAlert} tone="warn" className="mt-4 border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] text-xs">
        Chương trình đang dùng sẽ dừng. Lịch này không tự tăng tải.
      </Notice>

      <Button
        className="mt-4 w-full"
        disabled={!!error || createProgram.isPending || createProgram.isSuccess}
        onClick={() =>
          createProgram.mutate(toCustomProgramRequest(draft, startDate, Number(weeks)), {
            onSuccess: onCreated,
          })
        }
      >
        {createProgram.isPending ? "Đang tạo…" : "Tạo lịch"}
      </Button>

      <Sheet open={picking !== null} onClose={() => setPicking(null)} label="Chọn bài">
        <SheetHeader title="Chọn bài" onCancel={() => setPicking(null)} />
        <div className="overflow-y-auto px-4 pb-7">
          <ExercisePicker
            exercises={active}
            onPick={(exercise) => {
              if (!picking) return
              const { day, index } = picking
              if (index === null) {
                setDraft((prev) => ({ ...prev, [day]: [...prev[day], emptyExercise(exercise.id)] }))
              } else {
                patchExercise(day, index, { exerciseId: exercise.id })
              }
              setPicking(null)
            }}
          />
        </div>
      </Sheet>
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
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
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
