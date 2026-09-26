import { useState } from "react"
import { ChevronLeft, ChevronRight, LayoutTemplate, Pencil, PencilRuler } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SHEET_FOCUS, SheetHeader } from "@/components/ui/sheet"
import { useCurrentProgram } from "@/features/program/useCurrentProgram"
import { cn } from "@/lib/cn"
import { DayCard } from "./DayCard"
import type { ScheduledWorkoutView } from "./types"
import { useSchedule } from "./useSchedule"
import { dayTitle, parseIso, programMonths, toIso, toMonth, WEEKDAY_LABELS, weekProgress, type MonthCell } from "./weeks"

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
  const [menuOpen, setMenuOpen] = useState(false)

  if (schedule.isLoading) return <MonthSkeleton />

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
        <p className="text-sm text-[var(--color-danger)]">Không tải được lịch: {schedule.error.message}</p>
        <Button variant="secondary" onClick={() => schedule.refetch()}>
          Thử lại
        </Button>
      </Card>
    )
  }

  const { workouts, restDays } = schedule.data!
  if (workouts.length === 0) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Lịch chưa có buổi nào.</p>
        <Link to="/program">
          <Button>Chọn chương trình</Button>
        </Link>
      </Card>
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
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 text-[13px] font-semibold hover:bg-[var(--color-surface)]",
            SHEET_FOCUS,
          )}
        >
          <Pencil className="size-3.5" aria-hidden />
          Sửa lịch
        </button>
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

      <ScheduleMenu open={menuOpen} onClose={() => setMenuOpen(false)} progress={progress} />
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

/** "Sửa lịch": sửa cả lịch. Sửa MỘT buổi nằm ở thẻ ngày ("Sửa buổi này"). */
function ScheduleMenu({
  open,
  onClose,
  progress,
}: {
  open: boolean
  onClose: () => void
  progress: ReturnType<typeof weekProgress>
}) {
  const navigate = useNavigate()
  const program = useCurrentProgram()
  const options = [
    {
      Icon: LayoutTemplate,
      title: "Đổi chương trình mẫu",
      desc: "Chọn từ các chương trình soạn sẵn. App tự tăng tải theo luật.",
      to: "/program",
    },
    {
      Icon: PencilRuler,
      title: "Tự thiết kế lịch riêng",
      desc: "Tự chọn ngày tập, bài và con số. App không tự tăng tải.",
      to: "/my-schedule",
    },
  ]
  return (
    <Sheet open={open} onClose={onClose} label="Sửa lịch">
      <SheetHeader title="Sửa lịch" onCancel={onClose} />
      <div className="overflow-y-auto px-4 pb-7">
        {program.data && (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3 py-2.5 text-xs text-[var(--color-text-muted)]">
            Đang dùng: <b className="text-[var(--color-text)]">{program.data.templateName}</b>
            {progress.weekIndex !== null && ` · tuần ${progress.weekIndex}/${progress.totalWeeks}`}
          </p>
        )}
        {options.map(({ Icon, title, desc, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className={cn(
              "mt-2.5 flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-left",
              SHEET_FOCUS,
            )}
          >
            <span className="grid size-10.5 flex-none place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
              <Icon className="size-5.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-[var(--color-text-muted)]">{desc}</span>
            </span>
            <ChevronRight className="size-4.5 flex-none text-[var(--color-text-muted)]" aria-hidden />
          </button>
        ))}
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Muốn đổi một buổi thôi? Bấm vào ngày đó trên lịch rồi chọn "Sửa buổi này".
        </p>
      </div>
    </Sheet>
  )
}

/** §5.3 — skeleton đúng hình lưới tháng, không phải spinner giữa màn. */
function MonthSkeleton() {
  return (
    <div>
      <div className="h-3 w-40 rounded bg-[var(--color-surface-2)]" />
      <div className="mt-3.5 h-8 w-24 rounded bg-[var(--color-surface-2)]" />
      <div className="mt-6 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="mx-auto size-8 rounded-full bg-[var(--color-surface)]" />
        ))}
      </div>
      <div className="mt-4 h-40 rounded-2xl bg-[var(--color-surface)]" />
    </div>
  )
}
