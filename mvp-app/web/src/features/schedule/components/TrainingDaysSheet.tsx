import { useState } from "react"
import { Sheet, SHEET_FOCUS, SheetHeader } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import { previewDates, shortDayTitle } from "@/features/schedule/utils/programDays"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import { useChangeTrainingDays } from "@/features/schedule/api/useEditSchedule"
import { toIso, WEEKDAY_LABELS } from "@/features/schedule/utils/weeks"

type Props = {
  open: boolean
  onClose: () => void
  workouts: ScheduledWorkoutView[]
  startDate: string
  trainingDays: number[]
  sessionsMin: number | null
  sessionsMax: number | null
}

/** Khung "Ngày tập" (spec §3.2). Chỉ chương trình mẫu mở được khung này. */
export function TrainingDaysSheet(props: Props) {
  const change = useChangeTrainingDays()
  // Khung này luôn mount ở màn Chương trình: đóng thì xoá lỗi lần lưu trước, mở lại không còn.
  const close = () => {
    change.reset()
    props.onClose()
  }
  return (
    <Sheet open={props.open} onClose={close} label="Ngày tập" dismissible={!change.isPending}>
      {/* Mount lại mỗi lần mở: lựa chọn luôn bắt đầu từ ngày tập hiện tại. */}
      <Body {...props} onClose={close} change={change} />
    </Sheet>
  )
}

function Body({
  onClose,
  workouts,
  startDate,
  trainingDays,
  sessionsMin,
  sessionsMax,
  change,
}: Props & { change: ReturnType<typeof useChangeTrainingDays> }) {
  const [days, setDays] = useState(trainingDays)
  const sorted = [...days].sort((a, b) => a - b)
  const unchanged = sorted.join() === trainingDays.join()
  const outOfRange =
    sessionsMin !== null && sessionsMax !== null && days.length > 0 && (days.length < sessionsMin || days.length > sessionsMax)
  const range = sessionsMin === sessionsMax ? `${sessionsMin}` : `${sessionsMin}–${sessionsMax}`
  const preview = previewDates(workouts, days, toIso(new Date()), startDate, 3)

  return (
    <>
      <SheetHeader
        title="Ngày tập"
        confirmLabel={change.isPending ? "Đang lưu…" : "Lưu"}
        confirmDisabled={days.length === 0 || unchanged || change.isPending}
        onCancel={() => !change.isPending && onClose()}
        onConfirm={() => change.mutate(sorted, { onSuccess: onClose })}
      />
      <p className="flex-none px-4 pb-2.5 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
        Các buổi chưa tập dời sang ngày mới, giữ đúng thứ tự.
        <br />
        Buổi đã tập giữ nguyên.
      </p>
      <div className="overflow-y-auto px-4 pb-7">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((w, i) => {
            const day = i + 1
            const on = days.includes(day)
            return (
              <button
                key={w}
                type="button"
                aria-pressed={on}
                onClick={() => setDays((prev) => (on ? prev.filter((d) => d !== day) : [...prev, day]))}
                className={cn(
                  "h-12 rounded-[var(--radius-lg)] border text-[13px] font-bold",
                  on
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]",
                  SHEET_FOCUS,
                )}
              >
                {w}
              </button>
            )
          })}
        </div>
        {days.length === 0 && <p className="mt-2 text-xs text-[var(--color-danger)]">Chọn ít nhất một ngày tập.</p>}
        {outOfRange && (
          <p className="mt-3 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[var(--color-warn-tint)] px-3 py-2.5 text-xs text-[var(--color-warn)]">
            Chương trình này soạn cho {range} buổi/tuần.
          </p>
        )}
        {preview.length > 0 && (
          <>
            <div className="kicker mt-5">Các buổi tới</div>
            <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3">
              {preview.map((p) => (
                <div key={p.date} className="flex justify-between border-t border-[var(--color-border)] py-2 text-[13px] first:border-t-0">
                  <span className="num">{shortDayTitle(p.date)}</span>
                  <span className="text-[var(--color-text-muted)]">{p.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {change.isError && <p className="mt-3 text-sm text-[var(--color-danger)]">Lưu thất bại: {change.error.message}</p>}
      </div>
    </>
  )
}
