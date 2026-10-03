import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { previewDates, shortDayTitle } from "@/features/schedule/utils/programDays"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import { toIso, WEEKDAY_LABELS } from "@/features/schedule/utils/weeks"
import { cn } from "@/lib/cn"
import { Kicker } from "~/components/Kicker"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"
import { useChangeTrainingDays } from "~/features/schedule/useEditSchedule"

type Props = {
  open: boolean
  onClose: () => void
  workouts: ScheduledWorkoutView[]
  startDate: string
  trainingDays: number[]
  sessionsMin: number | null
  sessionsMax: number | null
}

/** Khung "Ngày tập" (doc/design-chuong-trinh-v1.md §3.2). Chỉ chương trình mẫu mở được khung này. */
export function TrainingDaysSheet(props: Props) {
  const change = useChangeTrainingDays()
  // Khung này luôn gắn ở màn Chương trình: đóng thì xoá lỗi lần lưu trước, mở lại không còn.
  const close = () => {
    change.reset()
    props.onClose()
  }
  return (
    <Sheet open={props.open} onClose={close} label="Ngày tập" dismissible={!change.isPending}>
      {/* Dựng lại mỗi lần mở: lựa chọn luôn bắt đầu từ ngày tập hiện tại. */}
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
      <Text className="px-4 pb-2.5 text-center text-xs leading-5 text-text-muted">
        {"Các buổi chưa tập dời sang ngày mới, giữ đúng thứ tự.\nBuổi đã tập giữ nguyên."}
      </Text>
      <ScrollView className="px-4" contentContainerClassName="pb-4">
        <View className="flex-row gap-1.5">
          {WEEKDAY_LABELS.map((w, i) => {
            const day = i + 1
            const on = days.includes(day)
            return (
              <Pressable
                key={w}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => setDays((prev) => (on ? prev.filter((d) => d !== day) : [...prev, day]))}
                className={cn(
                  "h-12 flex-1 items-center justify-center rounded-lg border",
                  on ? "border-accent bg-accent" : "border-border bg-bg",
                )}
              >
                <Text className={cn("text-[13px] font-bold", on ? "text-accent-fg" : "text-text-muted")}>{w}</Text>
              </Pressable>
            )
          })}
        </View>
        {days.length === 0 && <Text className="mt-2 text-xs text-danger">Chọn ít nhất một ngày tập.</Text>}
        {outOfRange && (
          <View className="mt-3 rounded-md border border-warn/30 bg-warn-tint px-3 py-2.5">
            <Text className="text-xs text-warn">Chương trình này soạn cho {range} buổi/tuần.</Text>
          </View>
        )}
        {preview.length > 0 && (
          <>
            <Kicker className="mt-5">Các buổi tới</Kicker>
            <View className="mt-2 rounded-md bg-bg px-3">
              {preview.map((p, i) => (
                <View key={p.date} className={cn("flex-row justify-between py-2", i > 0 && "border-t border-border")}>
                  <Text className="text-[13px] text-text" style={{ fontVariant: ["tabular-nums"] }}>
                    {shortDayTitle(p.date)}
                  </Text>
                  <Text className="text-[13px] text-text-muted">{p.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {change.isError && <Text className="mt-3 text-sm text-danger">Lưu thất bại: {change.error.message}</Text>}
      </ScrollView>
    </>
  )
}
