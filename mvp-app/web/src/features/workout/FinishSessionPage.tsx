import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlowScreen } from "@/components/UserShell"
import { cn } from "@/lib/cn"
import { formatDayMonth, formatNumber } from "@/lib/format"
import { useSchedule } from "@/features/schedule/useSchedule"
import { BODY_AREAS, type SetLogResponse } from "./types"
import { useFinishSession, useWorkoutSession } from "./useWorkoutSession"

const RPE_CHOICES = [4, 5, 6, 7, 8, 9, 10]

const SEVERITIES = [
  { value: 1, label: "1 nhẹ" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 nặng" },
]

/**
 * Màn 6 concept-frontend-v1.md — kết buổi: tóm tắt, rồi báo đau (chọn vùng và
 * mức độ). Báo đau là tín hiệu ưu tiên CAO NHẤT của engine điều chỉnh.
 *
 * "RPE hỏi mềm, bỏ qua được": không chọn gì vẫn kết buổi được, backend lưu
 * NULL chứ không phải 0. Thang 4–10 theo design — dưới 4 thì set đó không phải
 * set làm việc, và RPE từng set vẫn ghi riêng ở màn 5.
 */
export function FinishSessionPage() {
  const { scheduledWorkoutId } = useParams<{ scheduledWorkoutId: string }>()
  const navigate = useNavigate()
  const schedule = useSchedule()
  const session = useWorkoutSession(scheduledWorkoutId!)
  const finish = useFinishSession(session.data?.id)

  const [bodyArea, setBodyArea] = useState<string | null>(null)
  const [severity, setSeverity] = useState(2)
  const [sessionRpe, setSessionRpe] = useState<number | null>(null)

  const workout = schedule.data?.workouts.find((w) => w.id === scheduledWorkoutId)

  if (schedule.isLoading || session.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tổng kết buổi tập…</p>
  }
  if (session.isError || !workout) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-[var(--color-danger)]">
          {session.isError ? session.error.message : "Không tìm thấy buổi tập này trong lịch."}
        </p>
        <Button variant="secondary" onClick={() => navigate("/schedule")}>
          Về lịch tuần
        </Button>
      </Card>
    )
  }

  const sets = session.data!.sets
  const stats = summarise(sets, workout.exercises)

  return (
    <FlowScreen>
      <div className="kicker num">{formatDayMonth(workout.scheduledOn)}</div>
      <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.02em]">
        Xong buổi {workout.label ?? ""}.
      </h1>

      <div className="mt-4.5 grid grid-cols-2 gap-2">
        <Stat value={`${stats.loggedSets}`} label="set đã ghi" />
        <Stat value={formatNumber(stats.volumeKg)} label="kg tổng tải" />
        <Stat value={`${stats.doneExercises} / ${workout.exercises.length}`} label="bài hoàn thành" />
        <Stat value={elapsed(session.data!.startedAt)} label="thời gian" />
      </div>

      <div className="mt-6">
        <div className="text-[17px] font-bold">Buổi này nặng cỡ nào?</div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          4 là nhẹ nhàng, 10 là không thêm được rep nào.
        </div>
        <div className="mt-3 flex gap-1.5">
          {RPE_CHOICES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sessionRpe === value}
              onClick={() => setSessionRpe(sessionRpe === value ? null : value)}
              className={cn(
                "num flex-1 rounded-lg py-3 text-center",
                sessionRpe === value
                  ? "bg-[var(--color-accent)] text-[15px] font-bold text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]",
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-[var(--color-text-muted)]">
          {sessionRpe == null
            ? "Bỏ qua cũng được — engine vẫn chạy bằng rep và RPE từng set."
            : `RPE trung bình các set đã ghi: ${stats.avgRpe ?? "—"}`}
        </p>
      </div>

      <div className="mt-6">
        <div className="text-[17px] font-bold">Có đau ở đâu không?</div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Bỏ qua nếu không đau. Báo đau làm giảm tải hoặc đổi bài ở tuần kế — đây không phải chẩn
          đoán y tế, đau kéo dài thì đi khám.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BODY_AREAS.map((area) => {
            const on = bodyArea === area.value
            return (
              <button
                key={area.value}
                type="button"
                aria-pressed={on}
                onClick={() => setBodyArea(on ? null : area.value)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px]",
                  on
                    ? "border border-[var(--color-danger)] bg-[var(--color-danger-tint)] font-semibold text-[var(--color-danger)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                )}
              >
                {area.label}
                {on && " ✓"}
              </button>
            )
          })}
        </div>

        {bodyArea && (
          <div className="mt-3.5 flex items-center gap-2.5">
            <span className="text-[13px] text-[var(--color-text-muted)]">Mức độ</span>
            <div className="flex flex-1 gap-1.5">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={severity === s.value}
                  onClick={() => setSeverity(s.value)}
                  className={cn(
                    "num flex-1 rounded-lg py-2.5 text-[13px]",
                    severity === s.value
                      ? "border border-[var(--color-danger)] bg-[var(--color-danger-tint)] font-semibold text-[var(--color-danger)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {finish.isError && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">{finish.error.message}</p>
      )}

      <div className="flex-1" />
      <Button
        className="mt-6 w-full"
        disabled={finish.isPending}
        onClick={() =>
          finish.mutate(
            {
              painReports: bodyArea ? [{ bodyArea, severity, note: "" }] : [],
              sessionRpe,
            },
            { onSuccess: () => navigate("/schedule") },
          )
        }
      >
        {finish.isPending ? "Đang lưu…" : "Lưu và về lịch tuần"}
      </Button>
    </FlowScreen>
  )
}

/** Buổi chưa kết thúc nên finishedAt còn null — đếm từ lúc bắt đầu tới bây giờ. */
function elapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
  return minutes < 60 ? `${minutes}′` : `${Math.floor(minutes / 60)}h${minutes % 60}`
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
      <div className="num text-[26px] leading-none font-bold">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{label}</div>
    </div>
  )
}

function summarise(sets: SetLogResponse[], exercises: { exerciseId: string; targetSets: number }[]) {
  const logged = sets.filter((s) => !s.skipped)
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r != null)
  return {
    loggedSets: logged.length,
    volumeKg: Math.round(logged.reduce((sum, s) => sum + (s.reps ?? 0) * (s.loadKg ?? 0), 0)),
    doneExercises: exercises.filter(
      (ex) => sets.filter((s) => s.exerciseId === ex.exerciseId).length >= ex.targetSets,
    ).length,
    avgRpe:
      rpes.length === 0 ? null : Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10,
  }
}
