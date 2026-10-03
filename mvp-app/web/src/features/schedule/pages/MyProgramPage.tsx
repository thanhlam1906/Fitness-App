import { useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, LayoutTemplate, Pencil, PencilRuler } from "lucide-react"
import { Link } from "react-router"
import { ApiError } from "@/api/client"
import { ExerciseImage } from "@/components/ExerciseImage"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { useCurrentProgram } from "@/features/program/api/useCurrentProgram"
import { cn } from "@/lib/cn"
import { ExerciseGuideSheet } from "@/features/schedule/components/ExerciseGuideSheet"
import { formatTarget, programDays, shortDayTitle, type ProgramDay } from "@/features/schedule/utils/programDays"
import { TrainingDaysSheet } from "@/features/schedule/components/TrainingDaysSheet"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { useSchedule } from "@/features/schedule/api/useSchedule"
import { parseIso, toIso, WEEKDAY_LABELS, weekProgress } from "@/features/schedule/utils/weeks"
import { ProgramDayEditSheet } from "@/features/schedule/components/WorkoutEditor"

const OPTIONS = [
  { Icon: LayoutTemplate, title: "Đổi chương trình mẫu", desc: "Chọn từ các chương trình soạn sẵn. App tự tăng tải theo luật.", to: "/program" },
  { Icon: PencilRuler, title: "Tự thiết kế lịch riêng", desc: "Tự chọn ngày tập, bài và con số. App không tự tăng tải.", to: "/my-schedule" },
]

const dayMonth = (iso: string) => {
  const d = parseIso(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * "Chương trình của tôi" (doc/design-chuong-trinh-v1.md, mockup doc/mockup-program/demo.html):
 * cả chương trình một lượt theo loại buổi, sửa một loại buổi, đổi ngày tập.
 */
export function MyProgramPage() {
  const schedule = useSchedule()
  const program = useCurrentProgram()
  const [editing, setEditing] = useState<ProgramDay | null>(null)
  const [daysOpen, setDaysOpen] = useState(false)
  const [guide, setGuide] = useState<ScheduledExerciseView | null>(null)

  if (schedule.isLoading || program.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if ([schedule.error, program.error].some((e) => e instanceof ApiError && e.status === 404)) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Chưa có chương trình đang chạy.</p>
        <Link to="/program">
          <Button>Chọn chương trình</Button>
        </Link>
      </Card>
    )
  }
  if (schedule.isError || program.isError) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">Không tải được chương trình.</p>
        <Button variant="secondary" onClick={() => { schedule.refetch(); program.refetch() }}>
          Thử lại
        </Button>
      </Card>
    )
  }

  const { workouts, restDays, startDate } = schedule.data!
  const current = program.data!
  const isCustom = current.templateId === null
  const days = programDays(workouts, toIso(new Date()))
  const progress = weekProgress(workouts, startDate)
  const trainingDays = WEEKDAY_LABELS.map((_, i) => i + 1).filter((d) => !restDays.includes(d))
  const lastDate = workouts.at(-1)?.scheduledOn

  return (
    <div>
      <Link
        to="/schedule"
        className={cn("inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]", SHEET_FOCUS)}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Lịch
      </Link>
      <div className="kicker mt-3.5">Chương trình đang dùng</div>
      <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{current.templateName}</h1>
      <p className="num mt-2 text-[13px] text-[var(--color-text-muted)]">
        {progress.weekIndex !== null && `Tuần ${progress.weekIndex}/${progress.totalWeeks} · `}
        từ <b className="font-semibold text-[var(--color-text)]">{dayMonth(startDate)}</b>
        {lastDate && (
          <>
            {" "}đến <b className="font-semibold text-[var(--color-text)]">{dayMonth(lastDate)}</b>
          </>
        )}
      </p>
      <span
        className={cn(
          "mt-2.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
          isCustom ? "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]" : "bg-[var(--color-accent-tint)] text-[var(--color-accent)]",
        )}
      >
        {isCustom ? "Không tự tăng tải" : "Tự tăng tải theo luật"}
      </span>

      <SectionTitle
        action={
          !isCustom && (
            <button type="button" onClick={() => setDaysOpen(true)} className={cn("rounded-[var(--radius-sm)] px-1 text-[13px] font-bold text-[var(--color-accent)]", SHEET_FOCUS)}>
              Đổi
            </button>
          )
        }
      >
        Ngày tập trong tuần
      </SectionTitle>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((w, i) => (
          <span
            key={w}
            aria-label={`${w}: ${trainingDays.includes(i + 1) ? "ngày tập" : "nghỉ"}`}
            className={cn(
              "grid h-9 place-items-center rounded-[var(--radius-md)] text-[13px] font-bold",
              trainingDays.includes(i + 1)
                ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] opacity-60",
            )}
          >
            {w}
          </span>
        ))}
      </div>
      {isCustom && (
        <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
          Lịch tự thiết kế gắn bài theo thứ. Muốn đổi ngày thì thiết kế lại ở cuối trang.
        </p>
      )}

      <SectionTitle>{isCustom ? "Các buổi trong tuần" : "Các buổi · lặp lại theo thứ tự"}</SectionTitle>
      {days.map((day) => (
        <ProgramDayCard key={day.label} day={day} onEdit={() => setEditing(day)} onGuide={setGuide} />
      ))}

      <SectionTitle>Đổi cả chương trình</SectionTitle>
      {OPTIONS.map(({ Icon, title, desc, to }) => (
        <Link
          key={to}
          to={to}
          className={cn("mt-2.5 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5", SHEET_FOCUS)}
        >
          <span className="grid size-10.5 flex-none place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
            <Icon className="size-5.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{title}</span>
            <span className="mt-0.5 block text-xs leading-snug text-[var(--color-text-muted)]">{desc}</span>
          </span>
          <ChevronRight className="size-4.5 flex-none text-[var(--color-text-muted)]" aria-hidden />
        </Link>
      ))}

      {editing?.next && (
        <ProgramDayEditSheet label={editing.label} remaining={editing.remaining} workout={editing.next} open onClose={() => setEditing(null)} />
      )}
      {!isCustom && (
        <TrainingDaysSheet
          open={daysOpen}
          onClose={() => setDaysOpen(false)}
          workouts={workouts}
          startDate={startDate}
          trainingDays={trainingDays}
          sessionsMin={current.sessionsMin}
          sessionsMax={current.sessionsMax}
        />
      )}
      {guide && <ExerciseGuideSheet exercise={guide} days={days} open onClose={() => setGuide(null)} />}
    </div>
  )
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2.5 flex items-center justify-between">
      <h2 className="kicker">{children}</h2>
      {action}
    </div>
  )
}

function ProgramDayCard({
  day,
  onEdit,
  onGuide,
}: {
  day: ProgramDay
  onEdit: () => void
  onGuide: (exercise: ScheduledExerciseView) => void
}) {
  return (
    <section className="mt-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <h3 className="text-lg font-extrabold">Buổi {day.label}</h3>
          <p className="num mt-0.5 text-xs text-[var(--color-text-muted)]">
            {day.next ? `Còn ${day.remaining} buổi · tiếp theo ${shortDayTitle(day.next.scheduledOn)}` : "Đã tập hết"}
          </p>
        </div>
        {day.next && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Sửa buổi ${day.label}`}
            className={cn("flex h-8 flex-none items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-[13px] font-bold", SHEET_FOCUS)}
          >
            <Pencil className="size-3.5" aria-hidden />
            Sửa
          </button>
        )}
      </div>
      <div className="mt-2.5">
        {day.exercises.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onGuide(ex)}
            className={cn("flex w-full items-center gap-2.5 border-t border-[var(--color-border)] py-2.5 text-left", SHEET_FOCUS)}
          >
            <ExerciseImage slug={ex.exerciseSlug} alt="" variant="thumb" />
            <span className="min-w-0 flex-1 text-sm">{ex.exerciseName}</span>
            <span className="num text-[13px] whitespace-nowrap text-[var(--color-text-muted)]">{formatTarget(ex)}</span>
            <ChevronRight className="size-4 flex-none text-[var(--color-text-muted)]" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  )
}
