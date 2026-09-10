import { useState } from "react"
import { Link } from "react-router"
import { ApiError } from "@/api/client"
import { LoadDeltaBadge } from "@/components/LoadDeltaBadge"
import { SegmentBar, type Segment } from "@/components/SegmentBar"
import { StatusBadge } from "@/components/StatusBadge"
import { WrongFeedbackButton } from "@/components/WrongFeedbackButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/cn"
import { formatDayMonth } from "@/lib/format"
import type { ScheduledWorkoutView } from "./types"
import { useSchedule } from "./useSchedule"
import { toWeeks, WEEKDAY_LABELS, type DayCell } from "./weeks"

/**
 * Màn 4 concept-frontend-v1.md — "Lịch tuần", màn chính, nguồn sự thật.
 *
 * Design gộp lưới ô ngày và danh sách chi tiết thành MỘT danh sách dọc: mỗi
 * ngày một hàng, ngày nghỉ chỉ là một dòng chữ, và buổi hôm nay là thẻ nổi mang
 * luôn nút bắt đầu. Trên điện thoại thì đọc từ trên xuống là xong, không phải
 * đối chiếu hai chỗ.
 *
 * Xem từng tuần một (design ghi "Tuần 3 / 8"). Hai nút ‹ › là phần design không
 * vẽ nhưng thiếu thì 7 tuần còn lại không mở được.
 */
export function SchedulePage() {
  const schedule = useSchedule()
  const [weekOffset, setWeekOffset] = useState<number | null>(null)

  if (schedule.isLoading) {
    return <WeekSkeleton />
  }

  if (schedule.isError) {
    if (schedule.error instanceof ApiError && schedule.error.status === 404) {
      return (
        <Card className="space-y-3 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Chưa có chương trình đang chạy.</p>
          <Link to="/program">
            <Button>Chọn chương trình</Button>
          </Link>
        </Card>
      )
    }
    return (
      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">
          Không tải được lịch: {schedule.error.message}
        </p>
        <Button variant="secondary" onClick={() => schedule.refetch()}>
          Thử lại
        </Button>
      </Card>
    )
  }

  const { workouts, restDays } = schedule.data!
  const weeks = toWeeks(workouts, restDays)

  if (weeks.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Lịch chưa có buổi nào.</p>
        <Link to="/program">
          <Button>Chọn chương trình</Button>
        </Link>
      </Card>
    )
  }

  const todayIndex = weeks.findIndex((week) => week.some((day) => day.isToday))
  const current = clamp(weekOffset ?? (todayIndex === -1 ? 0 : todayIndex), 0, weeks.length - 1)
  const week = weeks[current]

  const sessions = week.filter((day) => day.workout)
  const doneCount = sessions.filter((day) => day.workout!.status === "DONE").length
  const totalWeeks = Math.max(...workouts.map((w) => w.weekIndex))
  const weekIndex = sessions[0]?.workout?.weekIndex ?? current + 1

  return (
    <div>
      <div className="kicker flex items-center justify-between gap-2">
        <span className="num">
          Tuần {weekIndex} / {totalWeeks} · {formatDayMonth(week[0].date)}–
          {formatDayMonth(week[6].date)}
        </span>
        <span className="num">
          {doneCount}/{sessions.length} buổi
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <h1 className="flex-1 text-[30px] font-extrabold tracking-[-0.02em]">Lịch tuần</h1>
        <WeekNav
          canPrev={current > 0}
          canNext={current < weeks.length - 1}
          onPrev={() => setWeekOffset(current - 1)}
          onNext={() => setWeekOffset(current + 1)}
        />
      </div>

      <SegmentBar className="mt-3" segments={weekSegments(sessions)} />

      <div className="mt-3.5 flex flex-col gap-1.5">
        {week.map((day) => (
          <DayRow key={day.date} day={day} />
        ))}
      </div>
    </div>
  )
}

/** Một đốt cho mỗi buổi trong tuần — xong là xanh, hôm nay là accent, còn lại xám. */
function weekSegments(sessions: DayCell[]): Segment[] {
  if (sessions.length === 0) return ["todo"]
  return sessions.map((day) =>
    day.workout!.status === "DONE" ? "done" : day.isToday ? "current" : "todo",
  )
}

function WeekNav({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const base =
    "size-8 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)]"
  return (
    <div className="flex gap-1.5">
      <button type="button" aria-label="Tuần trước" className={base} disabled={!canPrev} onClick={onPrev}>
        ‹
      </button>
      <button type="button" aria-label="Tuần sau" className={base} disabled={!canNext} onClick={onNext}>
        ›
      </button>
    </div>
  )
}

function DayRow({ day }: { day: DayCell }) {
  if (!day.workout) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-2">
        <DayCellLabel day={day} muted />
        <span className="text-[13px] text-[var(--color-text-muted)]">
          {day.isRestDay ? "Ngày nghỉ" : "—"}
        </span>
      </div>
    )
  }

  return day.isToday ? <TodayCard day={day} /> : <WorkoutRow day={day} />
}

/** Buổi hôm nay là thứ duy nhất được nổi lên: thẻ sáng hơn, có viền, mang nút bắt đầu. */
function TodayCard({ day }: { day: DayCell }) {
  const workout = day.workout!
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5">
      <div className="flex items-start gap-3">
        <DayCellLabel day={day} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.12em] text-[var(--color-accent)] uppercase">
            Hôm nay
          </div>
          <div className="mt-0.5 text-[19px] font-bold">Buổi {workout.label ?? ""}</div>
          <p className="num mt-0.5 text-xs text-[var(--color-text-muted)]">
            {summarise(workout, true)}
          </p>
        </div>
      </div>

      <Decisions workout={workout} />

      <Link to={`/workout/${workout.id}`}>
        <Button className="mt-3.5 w-full">Bắt đầu buổi tập</Button>
      </Link>
    </div>
  )
}

function WorkoutRow({ day }: { day: DayCell }) {
  const workout = day.workout!
  const missed = workout.status === "MISSED" || workout.status === "SKIPPED"
  return (
    <Link
      to={`/workout/${workout.id}`}
      className={cn(
        "block rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3",
        missed && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3">
        <DayCellLabel day={day} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Buổi {workout.label ?? ""}</div>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{summarise(workout)}</p>
        </div>
        <StatusBadge status={workout.status} variant="text" />
      </div>
      <Decisions workout={workout} />
    </Link>
  )
}

/** Lý do đổi tải hiện NGAY TẠI CHỖ (§4 màn 4), không giấu sau một cú bấm. */
function Decisions({ workout }: { workout: ScheduledWorkoutView }) {
  const decisions = workout.exercises.filter((ex) => ex.loadDecision)
  if (decisions.length === 0) return null
  return (
    <div className="mt-2.5 space-y-2 pl-[46px]">
      {decisions.map((ex) => (
        <div key={ex.id}>
          <div className="flex gap-2">
            <LoadDeltaBadge decision={ex.loadDecision!} />
            <span className="text-xs leading-snug text-[var(--color-text-muted)]">
              {ex.loadDecision!.messageVi}
            </span>
          </div>
          <div className="mt-1">
            <WrongFeedbackButton source={{ loadDecisionId: ex.loadDecision!.id }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DayCellLabel({ day, muted = false }: { day: DayCell; muted?: boolean }) {
  return (
    <div className="w-[34px] flex-none text-center">
      <div
        className={cn(
          "text-[10px] tracking-[0.08em]",
          day.isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
        )}
      >
        {WEEKDAY_LABELS[day.weekday - 1]}
      </div>
      <div
        className={cn(
          "num text-[17px]",
          day.isToday ? "font-bold" : "font-semibold",
          muted && "text-[var(--color-text-muted)]",
        )}
      >
        {day.date.slice(8)}
      </div>
    </div>
  )
}

function summarise(workout: ScheduledWorkoutView, withSets = false): string {
  return workout.exercises
    .map((ex) =>
      withSets ? `${ex.exerciseName} ${ex.targetSets}×${ex.targetReps}` : ex.exerciseName,
    )
    .join(" · ")
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** §5.3 — skeleton đúng hình hàng ngày, không phải spinner giữa màn. */
function WeekSkeleton() {
  return (
    <div>
      <div className="h-3 w-40 rounded bg-[var(--color-surface-2)]" />
      <div className="mt-3.5 h-8 w-32 rounded bg-[var(--color-surface-2)]" />
      <div className="mt-3.5 flex flex-col gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-14 rounded-[var(--radius-md)] bg-[var(--color-surface)]" />
        ))}
      </div>
    </div>
  )
}
