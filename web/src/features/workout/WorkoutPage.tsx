import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSchedule } from "@/features/schedule/useSchedule"
import { ExerciseLogger } from "./ExerciseLogger"
import type { PainReportInput } from "./types"
import { useFinishSession, useWorkoutSession } from "./useWorkoutSession"

/** concept-frontend-v1.md màn 5–6 — buổi tập chi tiết + kết buổi (báo đau). */
export function WorkoutPage() {
  const { scheduledWorkoutId } = useParams<{ scheduledWorkoutId: string }>()
  const navigate = useNavigate()
  const schedule = useSchedule()
  const { sessionId, isStarting, startError, clearSession } = useWorkoutSession(scheduledWorkoutId!)
  const finish = useFinishSession(sessionId)

  const [hasPain, setHasPain] = useState(false)
  const [bodyArea, setBodyArea] = useState("")
  const [severity, setSeverity] = useState(2)
  const [note, setNote] = useState("")

  const workout = schedule.data?.workouts.find((w) => w.id === scheduledWorkoutId)

  if (schedule.isLoading || isStarting || !sessionId) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang chuẩn bị buổi tập…</p>
  }
  if (startError) {
    return <p className="text-sm text-[var(--color-danger)]">Không bắt đầu được buổi tập: {startError.message}</p>
  }
  if (!workout) {
    return <p className="text-sm text-[var(--color-danger)]">Không tìm thấy buổi tập này trong lịch.</p>
  }

  function onFinish() {
    const painReports: PainReportInput[] = hasPain && bodyArea.trim()
      ? [{ bodyArea: bodyArea.trim(), severity, note }]
      : []
    finish.mutate(painReports, {
      onSuccess: () => {
        clearSession()
        navigate("/schedule")
      },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">
        {workout.scheduledOn} · Buổi {workout.label}
      </h1>

      <div className="space-y-4">
        {workout.exercises.map((ex) => (
          <Card key={ex.id}>
            <ExerciseLogger exercise={ex} sessionId={sessionId} />
          </Card>
        ))}
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-medium">Kết thúc buổi</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasPain} onChange={(e) => setHasPain(e.target.checked)} />
          Có đau hoặc khó chịu
        </label>
        {hasPain && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="bodyArea">Vùng đau</Label>
              <Input id="bodyArea" placeholder="KNEE_L, LOWER_BACK…" value={bodyArea} onChange={(e) => setBodyArea(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="severity">Mức độ (1–5)</Label>
              <Input
                id="severity"
                type="number"
                min={1}
                max={5}
                className="num"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="note">Ghi chú</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}
        {finish.isError && <p className="text-sm text-[var(--color-danger)]">{finish.error.message}</p>}
        <Button onClick={onFinish} disabled={finish.isPending}>
          {finish.isPending ? "Đang lưu…" : "Kết thúc buổi"}
        </Button>
      </Card>
    </div>
  )
}
