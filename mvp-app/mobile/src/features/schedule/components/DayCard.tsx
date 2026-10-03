import { useState, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Pencil } from "lucide-react-native"
import { summarizeSession } from "@/features/schedule/utils/sessionSummary"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import { dayTitle, nextPlannedAfter, parseIso, type MonthCell } from "@/features/schedule/utils/weeks"
import { SKIP_REASONS } from "@/features/workout/types"
import { cn } from "@/lib/cn"
import { formatKg, formatNumber } from "@/lib/format"
import { LoadDeltaBadge } from "~/components/LoadDeltaBadge"
import { Button } from "~/components/ui/Button"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { useSessionOfDay } from "~/features/schedule/api/useSchedule"
import { WorkoutEditSheet } from "~/features/schedule/components/WorkoutEditor"
import { colors } from "~/theme"

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Thẻ dưới lưới tháng: nội dung đổi theo trạng thái ngày đang chọn (doc/design-ui-m3-v1.md §2) —
 * bản mobile của DayCard web. Mở app ra là thẻ hôm nay, nên việc chính vẫn chỉ một chạm là
 * "Bắt đầu buổi tập".
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
  const router = useRouter()
  const workout = cell.workout
  if (!workout) return <NoWorkoutCard cell={cell} workouts={workouts} />

  const status = workout.status
  if (status === "DONE") return <DoneCard cell={cell} workout={workout} totalWeeks={totalWeeks} />
  if (status === "MISSED" || status === "SKIPPED") {
    return (
      <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} pill={<Pill tone="danger">Bỏ lỡ</Pill>}>
        <PlanList workout={workout} />
        {/* Buổi bỏ lỡ vẫn tập được (backend không chặn) — người ta hay tập bù hôm sau. */}
        <Button variant="secondary" className="mt-3.5 w-full" onPress={() => router.push(`/workout/${workout.id}`)}>
          Tập bù buổi này
        </Button>
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
  const router = useRouter()
  const session = useSessionOfDay(workout.id)
  const inProgress = session.data?.status === "IN_PROGRESS"
  return (
    <CardShell cell={cell} workout={workout} totalWeeks={totalWeeks} highlight pill={<Pill tone="accent">Hôm nay</Pill>}>
      <PlanList workout={workout} />
      <Decisions workout={workout} />
      <Button className="mt-3.5 w-full" onPress={() => router.push(`/workout/${workout.id}`)}>
        {inProgress ? "Tiếp tục buổi tập" : "Bắt đầu buổi tập"}
      </Button>
      {/* Đang tập dở thì không sửa buổi: set đã log đang bám vào danh sách bài hiện tại. */}
      {!inProgress && <EditLink workout={workout} />}
    </CardShell>
  )
}

function DoneCard({ cell, workout, totalWeeks }: { cell: MonthCell; workout: ScheduledWorkoutView; totalWeeks: number }) {
  const session = useSessionOfDay(workout.id)
  let body: ReactNode
  if (session.isLoading) {
    body = <Text className="mt-3 text-sm text-text-muted">Đang tải buổi đã tập…</Text>
  } else if (session.isError) {
    body = (
      <View className="mt-3 gap-2">
        <Text className="text-sm text-danger">Không tải được buổi này: {session.error.message}</Text>
        <Button variant="secondary" size="sm" className="self-start" onPress={() => session.refetch()}>
          Thử lại
        </Button>
      </View>
    )
  } else if (!session.data) {
    body = <Text className="mt-3 text-sm text-text-muted">Không có dữ liệu set của buổi này.</Text>
  } else {
    const summary = summarizeSession(session.data, workout.exercises)
    body = (
      <>
        <View className="mt-3 flex-row gap-2">
          <Stat value={summary.minutes === null ? "—" : String(summary.minutes)} label="phút" />
          <Stat value={formatNumber(summary.totalKg)} label="kg tổng tạ" />
          <Stat value={session.data.sessionRpe === null ? "—" : String(session.data.sessionRpe)} label="RPE buổi" />
        </View>
        <View className="mt-1">
          {summary.rows.map(({ exercise, sets, loads }, i) => (
            <View key={exercise.id} className={cn("py-2.5", i > 0 && "border-t border-border")}>
              <View className="flex-row justify-between gap-2">
                <Text className="flex-1 text-sm text-text">{exercise.exerciseName}</Text>
                <Text className="text-sm text-text-muted" style={NUM}>
                  {loads.length === 0 ? "tự trọng" : loads.map((l) => formatKg(l)).join(" → ")}
                </Text>
              </View>
              <View className="mt-1.5 flex-row flex-wrap items-center justify-end gap-1.5">
                <Text className="mr-auto text-[11px] text-text-muted" style={NUM}>
                  Mục tiêu {exercise.targetSets}×{exercise.targetReps}
                </Text>
                {sets.length === 0 && <Text className="text-[11px] text-text-muted">Không log set nào</Text>}
                {sets.map((s) =>
                  s.skipped ? (
                    <View key={s.setIndex} className="rounded-sm bg-surface-2 px-1.5 py-1">
                      <Text className="text-[11px] text-text-muted">bỏ · {skipLabel(s.skipReason)}</Text>
                    </View>
                  ) : (
                    <View
                      key={s.setIndex}
                      accessibilityLabel={s.loadKg === null ? undefined : `${s.reps ?? "—"} rep, ${formatKg(s.loadKg)}`}
                      className={cn(
                        "h-[26px] min-w-7 items-center justify-center rounded-sm px-1.5",
                        s.short ? "bg-warn-tint" : "bg-success-tint",
                      )}
                    >
                      <Text className={cn("text-[13px] font-bold", s.short ? "text-warn" : "text-success")} style={NUM}>
                        {s.reps ?? "—"}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
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
    <View className="mt-3.5 items-center rounded-2xl bg-surface p-[18px]">
      <Text className="text-center text-sm font-semibold text-text">
        {dayTitle(cell.date)}
        {inProgram && (cell.isRestDay ? " · Ngày nghỉ" : " · Không có buổi")}
      </Text>
      {!inProgram && <Text className="text-center text-sm text-text-muted">Không có buổi nào trong chương trình</Text>}
      {next && (
        <Text className="text-center text-sm text-text-muted" style={NUM}>
          Buổi tới: {WEEKDAY_SHORT[parseIso(next.scheduledOn).getDay()]} {dayTitle(next.scheduledOn).split(" ").pop()} ·
          Buổi {next.label ?? ""}
        </Text>
      )}
    </View>
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
    <View
      accessibilityLabel={dayTitle(cell.date)}
      className={cn("mt-3.5 rounded-2xl border border-border p-3.5", highlight ? "bg-surface-2" : "bg-surface")}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className={cn(
            "flex-1 text-[10px] font-extrabold uppercase tracking-[1.2px]",
            highlight ? "text-accent" : "text-text-muted",
          )}
          style={NUM}
        >
          {dayTitle(cell.date)} · Tuần {workout.weekIndex}/{totalWeeks}
        </Text>
        {pill}
      </View>
      <Text className="mt-0.5 text-[19px] font-extrabold text-text">Buổi {workout.label ?? ""}</Text>
      {children}
    </View>
  )
}

const PILL_TONES = {
  accent: { box: "bg-accent-tint", text: "text-accent" },
  success: { box: "bg-success-tint", text: "text-success" },
  danger: { box: "bg-danger-tint", text: "text-danger" },
  muted: { box: "bg-surface-2", text: "text-text-muted" },
}

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <View className={cn("rounded-full px-2 py-0.5", PILL_TONES[tone].box)}>
      <Text className={cn("text-[11px] font-bold", PILL_TONES[tone].text)}>{children}</Text>
    </View>
  )
}

function PlanList({ workout }: { workout: ScheduledWorkoutView }) {
  return (
    <View className="mt-2">
      {workout.exercises.map((ex, i) => (
        <View key={ex.id} className={cn("flex-row justify-between gap-2 py-2", i > 0 && "border-t border-border")}>
          <Text className="flex-1 text-sm text-text">{ex.exerciseName}</Text>
          <Text className="text-sm text-text-muted" style={NUM}>
            {ex.targetSets}×{ex.targetReps}
            {ex.targetRepsMax > ex.targetReps ? `–${ex.targetRepsMax}` : ""}
            {ex.targetLoadKg === null ? "" : ` · ${formatKg(ex.targetLoadKg)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Lý do đổi tải hiện NGAY TRONG THẺ ngày (§4 màn 4), kèm nút "cái này sai" cho mỗi quyết định. */
function Decisions({ workout }: { workout: ScheduledWorkoutView }) {
  const decisions = workout.exercises.filter((ex) => ex.loadDecision)
  if (decisions.length === 0) return null
  return (
    <View className="mt-2.5 gap-2">
      {decisions.map((ex) => (
        <View key={ex.id} className="flex-row gap-2">
          <LoadDeltaBadge decision={ex.loadDecision!} />
          <View className="flex-1">
            <Text className="text-xs leading-4 text-text-muted">
              {ex.exerciseName}: {ex.loadDecision!.messageVi}
            </Text>
            <View className="mt-1">
              <WrongFeedbackButton source={{ loadDecisionId: ex.loadDecision!.id }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

function EditLink({ workout }: { workout: ScheduledWorkoutView }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className="mt-2.5 h-10 w-full flex-row items-center justify-center gap-1.5 rounded-md"
      >
        <Pencil size={14} color={colors["text-muted"]} />
        <Text className="text-[13px] font-semibold text-text-muted">Sửa buổi này</Text>
      </Pressable>
      <WorkoutEditSheet workout={workout} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 rounded-md bg-bg px-2.5 py-2">
      <Text className="text-lg font-bold text-text" style={NUM}>
        {value}
      </Text>
      <Text className="text-[11px] text-text-muted">{label}</Text>
    </View>
  )
}

function skipLabel(reason: string | null): string {
  return SKIP_REASONS.find((r) => r.value === reason)?.label.toLowerCase() ?? "không rõ lý do"
}
