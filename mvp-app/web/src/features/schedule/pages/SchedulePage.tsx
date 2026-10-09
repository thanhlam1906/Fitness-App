import { CalendarOff, ChevronLeft, ChevronRight, CloudOff, List } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBlock } from "@/components/StatusViews"
import { cn } from "@/lib/cn"
import { DayCard } from "@/features/schedule/components/DayCard"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import { useSchedule } from "@/features/schedule/api/useSchedule"
import { dayTitle, parseIso, programMonths, toIso, toMonth, WEEKDAY_LABELS, weekProgress, type MonthCell } from "@/features/schedule/utils/weeks"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Màn Lịch (doc/design-ui-m3-v1.md, mockup doc/mockup-m3/demo.html): lưới tháng,
 * ô tô theo trạng thái buổi, thẻ ngày bên dưới. Mở app là thẻ hôm nay, nên việc
 * chính vẫn một chạm là "Bắt đầu buổi tập".
 *
 * Ngày đang chọn nằm ở URL (?ngay=) theo §5.1 concept-frontend: tải lại không mất.
 * Tháng đang xem suy ra từ ngày đang chọn, không có state riêng.
 */
export function SchedulePage() {
  const schedule = useSchedule()
  const [params, setParams] = useSearchParams()

  if (schedule.isLoading) return <MonthSkeleton />

  if (schedule.isError) {
    if (schedule.error instanceof ApiError && schedule.error.status === 404) {
      return (
        <StatusBlock icon={CalendarOff} title="Chưa có chương trình">
          <Link to="/program">
            <Button>Chọn chương trình</Button>
          </Link>
        </StatusBlock>
      )
    }
    return (
      <StatusBlock icon={CloudOff} tone="danger" title="Không tải được lịch" detail={schedule.error.message}>
        <Button variant="secondary" onClick={() => schedule.refetch()}>
          Thử lại
        </Button>
      </StatusBlock>
    )
  }

  const { workouts, restDays } = schedule.data!
  if (workouts.length === 0) {
    return (
      <StatusBlock icon={CalendarOff} title="Lịch chưa có buổi nào">
        <Link to="/program">
          <Button>Chọn chương trình</Button>
        </Link>
      </StatusBlock>
    )
  }

  const todayIso = toIso(new Date())
  const asked = params.get("ngay")
  // Đúng khuôn chưa đủ: "2026-02-30" tràn sang tháng 3 và không có ô nào trong lưới.
  const selected = asked && ISO_DATE.test(asked) && toIso(parseIso(asked)) === asked ? asked : todayIso
  const shown = parseIso(selected)
  const year = shown.getFullYear()
  const month = shown.getMonth()
  const cells = toMonth(year, month, workouts, restDays)
  const cell = cells.find((c) => c.date === selected)!
  const progress = weekProgress(workouts, schedule.data!.startDate)

  // Chỉ lật trong các tháng có buổi của chương trình.
  const months = programMonths(workouts)
  const key = year * 12 + month
  const prev = months.filter((m) => m.year * 12 + m.month < key).at(-1)
  const next = months.find((m) => m.year * 12 + m.month > key)

  function select(iso: string) {
    setParams({ ngay: iso }, { replace: true })
  }

  // Lật sang tháng có hôm nay thì chọn hôm nay, tháng khác thì chọn ngày 1.
  function goMonth(m: { year: number; month: number }) {
    const today = new Date()
    select(
      today.getFullYear() === m.year && today.getMonth() === m.month ? todayIso : toIso(new Date(m.year, m.month, 1)),
    )
  }

  return (
    <div>
      <div className="kicker flex items-center justify-between gap-2">
        <span className="num">
          {progress.weekIndex === null ? `${progress.totalWeeks} tuần` : `Tuần ${progress.weekIndex} / ${progress.totalWeeks}`}
        </span>
        {progress.total > 0 && (
          <span className="num">
            {progress.done}/{progress.total} buổi tuần này
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <h1 className="flex-1 text-[30px] font-extrabold tracking-[-0.02em]">Lịch</h1>
        {/* Sửa cả chương trình ở màn riêng (doc/design-chuong-trinh-v1.md); sửa một ngày ở thẻ ngày. */}
        <Link
          to="/my-program"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 text-[13px] font-semibold hover:bg-[var(--color-surface)]",
            SHEET_FOCUS,
          )}
        >
          <List className="size-3.5" aria-hidden />
          Chương trình
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <MonthNav label="Tháng trước" disabled={!prev} onClick={() => prev && goMonth(prev)}>
          <ChevronLeft className="size-4.5" aria-hidden />
        </MonthNav>
        <h2 className="num text-base font-bold">
          Tháng {month + 1}, {year}
        </h2>
        <MonthNav label="Tháng sau" disabled={!next} onClick={() => next && goMonth(next)}>
          <ChevronRight className="size-4.5" aria-hidden />
        </MonthNav>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[11px] text-[var(--color-text-muted)]">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className={d === "CN" ? "text-[var(--color-danger)]" : undefined}>
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-y-1">
        {cells.map((c) => (
          <DayButton key={c.date} cell={c} selected={c.date === selected} onSelect={() => select(c.date)} />
        ))}
      </div>

      <Legend />

      <DayCard cell={cell} workouts={workouts} totalWeeks={progress.totalWeeks} />

    </div>
  )
}

const STATUS_WORD: Record<ScheduledWorkoutView["status"], string> = {
  DONE: "đã tập",
  PLANNED: "sắp tới",
  MISSED: "bỏ lỡ",
  SKIPPED: "bỏ lỡ",
}

function DayButton({ cell, selected, onSelect }: { cell: MonthCell; selected: boolean; onSelect: () => void }) {
  const status = cell.workout?.status
  const todayToGo = cell.isToday && status === "PLANNED"
  const label = [dayTitle(cell.date), cell.isToday && "hôm nay", status && STATUS_WORD[status]].filter(Boolean).join(", ")
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn("grid h-11.5 place-items-center rounded-xl", selected && "bg-[var(--color-surface-2)]", SHEET_FOCUS)}
    >
      <span
        className={cn(
          "num grid size-8 place-items-center rounded-full text-[15px]",
          !cell.inMonth && "opacity-35",
          todayToGo && "bg-[var(--color-accent)] font-extrabold text-[var(--color-accent-fg)]",
          !todayToGo && status === "DONE" && "bg-[var(--color-success-tint)] font-bold text-[var(--color-success)]",
          !todayToGo && status === "PLANNED" && "shadow-[inset_0_0_0_1.5px_var(--color-accent)]",
          (status === "MISSED" || status === "SKIPPED") &&
            "text-[var(--color-danger)] shadow-[inset_0_0_0_1.5px_var(--color-danger)]",
          cell.isToday && !status && "font-extrabold text-[var(--color-accent)]",
        )}
      >
        {Number(cell.date.slice(8))}
      </span>
    </button>
  )
}

function MonthNav({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30",
        SHEET_FOCUS,
      )}
    >
      {children}
    </button>
  )
}

function Legend() {
  const dot = "inline-block size-2.5 rounded-full align-[-1px] mr-1.5"
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
      <span>
        <i className={cn(dot, "bg-[var(--color-success)]")} />
        Đã tập
      </span>
      <span>
        <i className={cn(dot, "shadow-[inset_0_0_0_1.5px_var(--color-accent)]")} />
        Sắp tới
      </span>
      <span>
        <i className={cn(dot, "shadow-[inset_0_0_0_1.5px_var(--color-danger)]")} />
        Bỏ lỡ
      </span>
      <span>
        <i className={cn(dot, "bg-[var(--color-accent)]")} />
        Hôm nay
      </span>
    </div>
  )
}

/** §5.3 — skeleton đúng hình lưới tháng, không phải spinner giữa màn. */
function MonthSkeleton() {
  return (
    <div role="status" aria-label="Đang tải">
      <Skeleton className="h-3 w-40 rounded" />
      <Skeleton className="mt-3.5 h-8 w-24 rounded" />
      <div className="mt-6 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="mx-auto size-8 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-4 h-40 rounded-2xl" />
    </div>
  )
}
