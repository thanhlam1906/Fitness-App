import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import type { SetLogResponse } from "@/features/workout/types"
import { cn } from "@/lib/cn"
import { formatDayMonth, formatNumber } from "@/lib/format"
import { BodyMap } from "~/features/workout/components/BodyMap"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { useSchedule } from "~/features/schedule/api/useSchedule"
import { useFinishSession, useWorkoutSession } from "~/features/workout/api/useWorkoutSession"

const NUM = { fontVariant: ["tabular-nums" as const] }
const RPE_CHOICES = [4, 5, 6, 7, 8, 9, 10]

const SEVERITIES = [
  { value: 1, label: "1 nhẹ" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5 nặng" },
]

/**
 * Màn 6 concept-frontend-v1.md — kết buổi: tóm tắt, rồi báo đau (vùng + mức độ). Bản mobile của
 * FinishSessionPage web. Báo đau là tín hiệu ưu tiên CAO NHẤT của engine điều chỉnh. RPE hỏi mềm:
 * không chọn vẫn kết buổi được, backend lưu NULL chứ không phải 0.
 */
export default function FinishSessionScreen() {
  const router = useRouter()
  const { scheduledWorkoutId } = useLocalSearchParams<{ scheduledWorkoutId: string }>()
  const schedule = useSchedule()
  const session = useWorkoutSession(scheduledWorkoutId)
  const finish = useFinishSession(session.data?.id)

  const [bodyArea, setBodyArea] = useState<string | null>(null)
  const [severity, setSeverity] = useState(2)
  const [sessionRpe, setSessionRpe] = useState<number | null>(null)

  const workout = schedule.data?.workouts.find((w) => w.id === scheduledWorkoutId)

  if (schedule.isLoading || session.isLoading) {
    return (
      <Screen>
        <Text className="text-sm text-text-muted">Đang tổng kết buổi tập…</Text>
      </Screen>
    )
  }
  if (session.isError || !workout) {
    return (
      <Screen>
        <Card className="gap-3">
          <Text className="text-sm text-danger">
            {session.isError ? session.error.message : "Không tìm thấy buổi tập này trong lịch."}
          </Text>
          <Button variant="secondary" onPress={() => router.dismissTo("/schedule")}>
            Về lịch tuần
          </Button>
        </Card>
      </Screen>
    )
  }

  const sets = session.data!.sets
  const stats = summarise(sets, workout.exercises)

  return (
    <Screen>
      <Kicker style={NUM}>{formatDayMonth(workout.scheduledOn)}</Kicker>
      <Text className="mt-3 text-[28px] font-extrabold tracking-[-0.5px] text-text">Xong buổi {workout.label ?? ""}.</Text>

      <View className="mt-[18px] flex-row flex-wrap gap-2">
        <Stat value={`${stats.loggedSets}`} label="set đã ghi" />
        <Stat value={formatNumber(stats.volumeKg)} label="kg tổng tải" />
        <Stat value={`${stats.doneExercises} / ${workout.exercises.length}`} label="bài hoàn thành" />
        <Stat value={elapsed(session.data!.startedAt)} label="thời gian" />
      </View>

      <View className="mt-6">
        <Text className="text-[17px] font-bold text-text">Buổi này nặng cỡ nào?</Text>
        <Text className="mt-1 text-xs text-text-muted">4 là nhẹ nhàng, 10 là không thêm được rep nào.</Text>
        <View className="mt-3 flex-row gap-1.5">
          {RPE_CHOICES.map((value) => {
            const on = sessionRpe === value
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setSessionRpe(on ? null : value)}
                className={cn("flex-1 items-center rounded-lg py-3", on ? "bg-accent" : "bg-surface")}
              >
                <Text className={on ? "text-[15px] font-bold text-accent-fg" : "text-sm text-text-muted"} style={NUM}>
                  {value}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text className="mt-2.5 text-xs text-text-muted">
          {sessionRpe == null
            ? "Bỏ qua cũng được — engine vẫn chạy bằng rep và RPE từng set."
            : `RPE trung bình các set đã ghi: ${stats.avgRpe ?? "—"}`}
        </Text>
      </View>

      <View className="mt-6">
        <Text className="text-[17px] font-bold text-text">Có đau ở đâu không?</Text>
        <Text className="mt-1 text-xs leading-5 text-text-muted">
          Bỏ qua nếu không đau. Báo đau làm giảm tải hoặc đổi bài ở tuần kế — đây không phải chẩn đoán y tế,
          đau kéo dài thì đi khám.
        </Text>
        <View className="mt-3">
          <BodyMap value={bodyArea} onChange={(area) => setBodyArea(bodyArea === area ? null : area)} />
        </View>

        {bodyArea && (
          <View className="mt-3.5 flex-row items-center gap-2.5">
            <Text className="text-[13px] text-text-muted">Mức độ</Text>
            <View className="flex-1 flex-row gap-1.5">
              {SEVERITIES.map((s) => {
                const on = severity === s.value
                return (
                  <Pressable
                    key={s.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSeverity(s.value)}
                    className={cn("flex-1 items-center rounded-lg py-2.5", on ? "border border-danger bg-danger-tint" : "bg-surface")}
                  >
                    <Text className={cn("text-[13px]", on ? "font-semibold text-danger" : "text-text-muted")} style={NUM}>
                      {s.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}
      </View>

      {finish.isError && <Text className="mt-3 text-sm text-danger">{finish.error.message}</Text>}

      <Button
        className="mt-auto w-full"
        disabled={finish.isPending}
        onPress={() =>
          finish.mutate(
            { painReports: bodyArea ? [{ bodyArea, severity, note: "" }] : [], sessionRpe },
            { onSuccess: () => router.dismissTo("/schedule") },
          )
        }
      >
        {finish.isPending ? "Đang lưu…" : "Lưu và về lịch tuần"}
      </Button>
    </Screen>
  )
}

/** Buổi chưa kết thúc nên finishedAt còn null — đếm từ lúc bắt đầu tới bây giờ. */
function elapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
  return minutes < 60 ? `${minutes}′` : `${Math.floor(minutes / 60)}h${minutes % 60}`
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    // Hai ô một hàng như lưới 2 cột của web.
    <View className="rounded-md bg-surface p-3.5" style={{ width: "48.8%" }}>
      <Text className="text-[26px] font-bold leading-[28px] text-text" style={NUM}>
        {value}
      </Text>
      <Text className="mt-1 text-xs text-text-muted">{label}</Text>
    </View>
  )
}

function summarise(sets: SetLogResponse[], exercises: { exerciseId: string; targetSets: number }[]) {
  const logged = sets.filter((s) => !s.skipped)
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => r != null)
  return {
    loggedSets: logged.length,
    volumeKg: Math.round(logged.reduce((sum, s) => sum + (s.reps ?? 0) * (s.loadKg ?? 0), 0)),
    doneExercises: exercises.filter((ex) => sets.filter((s) => s.exerciseId === ex.exerciseId).length >= ex.targetSets)
      .length,
    avgRpe: rpes.length === 0 ? null : Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10,
  }
}
