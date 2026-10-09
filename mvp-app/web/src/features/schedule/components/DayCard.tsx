import { useState, type ReactNode } from "react"
import { BedDouble, CalendarMinus, Minus, Pencil } from "lucide-react"
import { Link } from "react-router"
import { LoadDeltaBadge } from "@/components/LoadDeltaBadge"
import { WrongFeedbackButton } from "@/features/feedback/components/WrongFeedbackButton"
import { Button } from "@/components/ui/button"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { IconCircle, IconText } from "@/components/StatusViews"
import { SKIP_REASONS } from "@/features/workout/types"
import { cn } from "@/lib/cn"
import { formatKg, formatNumber } from "@/lib/format"
import { summarizeSession } from "@/features/schedule/utils/sessionSummary"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import { useSessionOfDay } from "@/features/schedule/api/useSchedule"
import { dayTitle, nextPlannedAfter, parseIso, type MonthCell } from "@/features/schedule/utils/weeks"
import { WorkoutEditSheet } from "./WorkoutEditor"

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

/**
 * Thẻ dưới lưới tháng: nội dung đổi theo trạng thái ngày đang chọn
 * (doc/design-ui-m3-v1.md §2). Mở app ra là thẻ hôm nay, nên việc chính vẫn
 * chỉ một chạm là "Bắt đầu buổi tập".
 */
export function DayCard({
  cell,
  workouts,
  totalWeeks,
}: {
  cell: MonthCell
  workouts: ScheduledWorkoutView[]
  totalWeeks: number
}) {
  const workout = cell.workout
  if (!workout) return <NoWorkoutCard cell={cell} workouts={workouts} />

  const status = workout.status
  if (status === "DONE") return <DoneCard cell={cell} workout={workout} totalWeeks={totalWeeks} />
  if (status === "MISSED" || status === "SKIPPED") {
    return (
      <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} pill={<Pill tone="danger">Bỏ lỡ</Pill>}>
        <PlanList workout={workout} />
        {/* Buổi bỏ lỡ vẫn tập được (backend không chặn) — người ta hay tập bù hôm sau. */}
        <Link to={`/workout/${workout.id}`}>
          <Button variant="secondary" className="mt-3.5 w-full">
            Tập bù buổi này
          </Button>
        </Link>
      </CardShell>
    )
  }
  if (cell.isToday) return <TodayCard cell={cell} workout={workout} totalWeeks={totalWeeks} />
  return (
    <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} pill={<Pill tone="muted">Sắp tới</Pill>}>
      <PlanList workout={workout} />
      <Decisions workout={workout} />
      <EditLink workout={workout} />
    </CardShell>
  )
}

function TodayCard({ cell, workout, totalWeeks }: { cell: MonthCell; workout: ScheduledWorkoutView; totalWeeks: number }) {
  const session = useSessionOfDay(workout.id)
  const inProgress = session.data?.status === "IN_PROGRESS"
  return (
    <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} highlight pill={<Pill tone="accent">Hôm nay</Pill>}>
      <PlanList workout={workout} />
      <Decisions workout={workout} />
      <Link to={`/workout/${workout.id}`}>
        <Button className="mt-3.5 w-full">{inProgress ? "Tiếp tục buổi tập" : "Bắt đầu buổi tập"}</Button>
      </Link>
      {/* Đang tập dở thì không sửa buổi: set đã log đang bám vào danh sách bài hiện tại. */}
      {!inProgress && <EditLink workout={workout} />}
    </CardShell>
  )
}

function DoneCard({ cell, workout, totalWeeks }: { cell: MonthCell; workout: ScheduledWorkoutView; totalWeeks: number }) {
  const session = useSessionOfDay(workout.id)
  let body: ReactNode
  if (session.isLoading) {
    // Khung của thẻ đã tập: lưới 3 số rồi các dòng bài.
    body = (
      <div role="status" aria-label="Đang tải">
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="mt-3 h-12 w-full" />
        <Skeleton className="mt-2 h-12 w-full" />
      </div>
    )
  } else if (session.isError) {
    body = (
      <div className="mt-3 space-y-2">
        <IconText>Không tải được buổi này: {session.error.message}</IconText>
        <Button variant="secondary" size="sm" onClick={() => session.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  } else if (!session.data) {
    body = (
      <IconText icon={Minus} tone="muted" className="mt-3">
        Không có dữ liệu set của buổi này.
      </IconText>
    )
  } else {
    const summary = summarizeSession(session.data, workout.exercises)
    body = (
      <>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat value={summary.minutes === null ? "—" : String(summary.minutes)} label="phút" />
          <Stat value={formatNumber(summary.totalKg)} label="kg tổng tạ" />
          <Stat value={session.data.sessionRpe === null ? "—" : String(session.data.sessionRpe)} label="RPE buổi" />
        </div>
        <div className="mt-1">
          {summary.rows.map(({ exercise, sets, loads }) => (
            <div key={exercise.id} className="border-t border-[var(--color-border)] py-2.5 first:border-t-0">
              <div className="flex justify-between gap-2 text-sm">
                <span>{exercise.exerciseName}</span>
                <span className="num text-[var(--color-text-muted)]">
                  {loads.length === 0 ? "tự trọng" : loads.map((l) => formatKg(l)).join(" → ")}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5">
                <span className="num mr-auto text-[11px] text-[var(--color-text-muted)]">
                  Mục tiêu {exercise.targetSets}×{exercise.targetReps}
                </span>
                {sets.length === 0 && (
                  <IconText icon={Minus} tone="muted" className="text-[11px]">
                    Không log set nào
                  </IconText>
                )}
                {sets.map((s) =>
                  s.skipped ? (
                    <span
                      key={s.setIndex}
                      className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-1.5 py-1 text-[11px] text-[var(--color-text-muted)]"
                    >
                      bỏ · {skipLabel(s.skipReason)}
                    </span>
                  ) : (
                    <span
                      key={s.setIndex}
                      title={s.loadKg === null ? undefined : formatKg(s.loadKg)}
                      className={cn(
                        "num grid h-6.5 min-w-7 place-items-center rounded-[var(--radius-sm)] px-1.5 text-[13px] font-bold",
                        s.short
                          ? "bg-[var(--color-warn-tint)] text-[var(--color-warn)]"
                          : "bg-[var(--color-success-tint)] text-[var(--color-success)]",
                      )}
                    >
                      {s.reps ?? "—"}
                    </span>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }
  return (
    <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} pill={<Pill tone="success">Đã tập</Pill>}>
      {body}
      <Decisions workout={workout} />
    </CardShell>
  )
}

function NoWorkoutCard({ cell, workouts }: { cell: MonthCell; workouts: ScheduledWorkoutView[] }) {
  const dates = workouts.map((w) => w.scheduledOn).sort()
  const inProgram = cell.date >= dates[0] && cell.date <= dates[dates.length - 1]
  const next = inProgram ? nextPlannedAfter(workouts, cell.date) : null
  return (
    <div className="mt-3.5 flex flex-col items-center rounded-2xl bg-[var(--color-surface)] p-5 text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
      <IconCircle
        icon={inProgram && cell.isRestDay ? BedDouble : CalendarMinus}
        className="size-12 [&>svg]:size-5.5"
      />
      <div className="mt-2.5 text-[15px] font-semibold text-[var(--color-text)]">
        {dayTitle(cell.date)}
        {inProgram && (cell.isRestDay ? " · Ngày nghỉ" : " · Không có buổi")}
      </div>
      {!inProgram && <div>Ngoài thời gian chương trình</div>}
      {next && (
        <div className="num">
          Buổi tới: {WEEKDAY_SHORT[parseIso(next.scheduledOn).getDay()]} {dayTitle(next.scheduledOn).split(" ").pop()} · Buổi{" "}
          {next.label ?? ""}
        </div>
      )}
    </div>
  )
}

function CardShell({
  cell,
  workout,
  totalWeeks,
  pill,
  highlight = false,
  children,
}: {
  cell: MonthCell
  workout: ScheduledWorkoutView
  totalWeeks: number
  pill: ReactNode
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-label={dayTitle(cell.date)}
      className={cn(
        "mt-3.5 rounded-2xl border border-[var(--color-border)] p-3.5",
        highlight ? "bg-[var(--color-surface-2)]" : "bg-[var(--color-surface)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "num text-[10px] font-extrabold tracking-[0.12em] uppercase",
            highlight ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
          )}
        >
          {dayTitle(cell.date)} · Tuần {workout.weekIndex}/{totalWeeks}
        </span>
        {pill}
      </div>
      <div className="mt-0.5 text-[19px] font-extrabold">Buổi {workout.label ?? ""}</div>
      {children}
    </section>
  )
}

function Pill({ tone, children }: { tone: "accent" | "success" | "danger" | "muted"; children: ReactNode }) {
  const tones = {
    accent: "bg-[var(--color-accent-tint)] text-[var(--color-accent)]",
    success: "bg-[var(--color-success-tint)] text-[var(--color-success)]",
    danger: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
    muted: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  }
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap", tones[tone])}>{children}</span>
}

function PlanList({ workout }: { workout: ScheduledWorkoutView }) {
  return (
    <div className="mt-2">
      {workout.exercises.map((ex) => (
        <div
          key={ex.id}
          className="flex justify-between gap-2 border-t border-[var(--color-border)] py-2 text-sm first:border-t-0"
        >
          <span>{ex.exerciseName}</span>
          <span className="num text-[var(--color-text-muted)]">
            {ex.targetSets}×{ex.targetReps}
            {ex.targetRepsMax > ex.targetReps ? `–${ex.targetRepsMax}` : ""}
            {ex.targetLoadKg === null ? "" : ` · ${formatKg(ex.targetLoadKg)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Lý do đổi tải hiện NGAY TRONG THẺ ngày (§4 màn 4), kèm nút "cái này sai" cho mỗi quyết định. */
function Decisions({ workout }: { workout: ScheduledWorkoutView }) {
  const decisions = workout.exercises.filter((ex) => ex.loadDecision)
  if (decisions.length === 0) return null
  return (
    <div className="mt-2.5 space-y-2">
      {decisions.map((ex) => (
        <div key={ex.id} className="flex gap-2">
          <LoadDeltaBadge decision={ex.loadDecision!} />
          <div className="min-w-0">
            <p className="text-xs leading-snug text-[var(--color-text-muted)]">
              {ex.exerciseName}: {ex.loadDecision!.messageVi}
            </p>
            <div className="mt-1">
              <WrongFeedbackButton source={{ loadDecisionId: ex.loadDecision!.id }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EditLink({ workout }: { workout: ScheduledWorkoutView }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          SHEET_FOCUS,
        )}
      >
        <Pencil className="size-3.5" aria-hidden />
        Sửa buổi này
      </button>
      <WorkoutEditSheet workout={workout} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-bg)] px-2.5 py-2">
      <div className="num text-lg font-bold">{value}</div>
      <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
    </div>
  )
}

function skipLabel(reason: string | null): string {
  return SKIP_REASONS.find((r) => r.value === reason)?.label.toLowerCase() ?? "không rõ lý do"
}
