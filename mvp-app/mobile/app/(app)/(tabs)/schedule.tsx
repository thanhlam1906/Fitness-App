import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ChevronLeft, ChevronRight, List } from "lucide-react-native"
import type { ScheduledWorkoutView } from "@/features/schedule/types"
import {
  dayTitle,
  parseIso,
  programMonths,
  toIso,
  toMonth,
  WEEKDAY_LABELS,
  weekProgress,
  type MonthCell,
} from "@/features/schedule/weeks"
import { cn } from "@/lib/cn"
import { ApiError } from "~/api/client"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { DayCard } from "~/features/schedule/DayCard"
import { useNewDayOnResume, useRefreshOnFocus } from "~/lib/focus"
import { useSchedule } from "~/features/schedule/useSchedule"
import { colors } from "~/theme"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const NUM = { fontVariant: ["tabular-nums" as const] }
// 7 ô một hàng: lưới grid-cols-7 của web.
const CELL = { width: `${100 / 7}%` as const }

/**
 * Màn Lịch (doc/design-ui-m3-v1.md, mockup doc/mockup-m3/demo.html) — bản mobile của SchedulePage
 * web: lưới tháng, ô tô theo trạng thái buổi, thẻ ngày bên dưới. Ngày đang chọn nằm ở tham số
 * `ngay` của route như `?ngay=` bên web; tháng đang xem suy ra từ ngày đang chọn.
 */
export default function ScheduleScreen() {
  const router = useRouter()
  const schedule = useSchedule()
  const params = useLocalSearchParams<{ ngay?: string }>()
  useRefreshOnFocus(schedule.refetch)
  useNewDayOnResume(() => router.setParams({ ngay: undefined }))

  if (schedule.isLoading) return <MonthSkeleton />

  if (schedule.isError) {
    if (schedule.error instanceof ApiError && schedule.error.status === 404) {
      return <NoProgram message="Chưa có chương trình đang chạy." />
    }
    return (
      <Screen>
        <Card className="gap-3">
          <Text className="text-sm text-danger">Không tải được lịch: {schedule.error.message}</Text>
          <Button variant="secondary" onPress={() => schedule.refetch()}>
            Thử lại
          </Button>
        </Card>
      </Screen>
    )
  }

  const { workouts, restDays } = schedule.data!
  if (workouts.length === 0) return <NoProgram message="Lịch chưa có buổi nào." />

  const todayIso = toIso(new Date())
  const asked = params.ngay
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
    router.setParams({ ngay: iso })
  }

  // Lật sang tháng có hôm nay thì chọn hôm nay, tháng khác thì chọn ngày 1.
  function goMonth(m: { year: number; month: number }) {
    const today = new Date()
    select(today.getFullYear() === m.year && today.getMonth() === m.month ? todayIso : toIso(new Date(m.year, m.month, 1)))
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between gap-2">
        <Kicker style={NUM}>
          {progress.weekIndex === null ? `${progress.totalWeeks} tuần` : `Tuần ${progress.weekIndex} / ${progress.totalWeeks}`}
        </Kicker>
        {progress.total > 0 && (
          <Kicker style={NUM}>
            {progress.done}/{progress.total} buổi tuần này
          </Kicker>
        )}
      </View>

      <View className="mt-2.5 flex-row items-center gap-3">
        <Text className="flex-1 text-[30px] font-extrabold tracking-[-0.6px] text-text">Lịch</Text>
        {/* Sửa cả chương trình ở màn riêng (doc/design-chuong-trinh-v1.md); sửa một ngày ở thẻ ngày. */}
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/my-program")}
          className="h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3.5 active:bg-surface"
        >
          <List size={14} color={colors.text} />
          <Text className="text-[13px] font-semibold text-text">Chương trình</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <MonthNav label="Tháng trước" disabled={!prev} onPress={() => prev && goMonth(prev)}>
          <ChevronLeft size={18} color={colors["text-muted"]} />
        </MonthNav>
        <Text className="text-base font-bold text-text" style={NUM}>
          Tháng {month + 1}, {year}
        </Text>
        <MonthNav label="Tháng sau" disabled={!next} onPress={() => next && goMonth(next)}>
          <ChevronRight size={18} color={colors["text-muted"]} />
        </MonthNav>
      </View>

      <View className="mt-3 flex-row">
        {WEEKDAY_LABELS.map((d) => (
          <Text key={d} style={CELL} className={cn("text-center text-[11px]", d === "CN" ? "text-danger" : "text-text-muted")}>
            {d}
          </Text>
        ))}
      </View>
      <View className="mt-1.5 flex-row flex-wrap">
        {cells.map((c) => (
          <DayButton key={c.date} cell={c} selected={c.date === selected} onSelect={() => select(c.date)} />
        ))}
      </View>

      <Legend />

      <DayCard cell={cell} workouts={workouts} totalWeeks={progress.totalWeeks} />
    </Screen>
  )
}

function NoProgram({ message }: { message: string }) {
  const router = useRouter()
  return (
    <Screen>
      <Card className="items-center gap-3">
        <Text className="text-center text-sm text-text-muted">{message}</Text>
        <Button onPress={() => router.push("/program")}>Chọn chương trình</Button>
      </Card>
    </Screen>
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
  const missed = status === "MISSED" || status === "SKIPPED"
  const label = [dayTitle(cell.date), cell.isToday && "hôm nay", status && STATUS_WORD[status]].filter(Boolean).join(", ")
  return (
    <View style={CELL} className="py-0.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onSelect}
        className={cn("h-[46px] items-center justify-center rounded-xl", selected && "bg-surface-2")}
      >
        {/* Viền 1.5px thay cho shadow inset của web (RN không có). */}
        <View
          className={cn(
            "size-8 items-center justify-center rounded-full",
            !cell.inMonth && "opacity-35",
            todayToGo && "bg-accent",
            !todayToGo && status === "DONE" && "bg-success-tint",
            !todayToGo && status === "PLANNED" && "border-[1.5px] border-accent",
            missed && "border-[1.5px] border-danger",
          )}
        >
          <Text
            className={cn(
              "text-[15px] text-text",
              todayToGo && "font-extrabold text-accent-fg",
              !todayToGo && status === "DONE" && "font-bold text-success",
              missed && "text-danger",
              cell.isToday && !status && "font-extrabold text-accent",
            )}
            style={NUM}
          >
            {Number(cell.date.slice(8))}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

function MonthNav({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string
  disabled: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn("size-8 items-center justify-center rounded-md bg-surface", disabled && "opacity-30")}
    >
      {children}
    </Pressable>
  )
}

function Legend() {
  const items: { dot: string; label: string }[] = [
    { dot: "bg-success", label: "Đã tập" },
    { dot: "border-[1.5px] border-accent", label: "Sắp tới" },
    { dot: "border-[1.5px] border-danger", label: "Bỏ lỡ" },
    { dot: "bg-accent", label: "Hôm nay" },
  ]
  return (
    <View className="mt-2.5 flex-row flex-wrap gap-x-3 gap-y-1">
      {items.map((it) => (
        <View key={it.label} className="flex-row items-center gap-1.5">
          <View className={cn("size-2.5 rounded-full", it.dot)} />
          <Text className="text-[11px] text-text-muted">{it.label}</Text>
        </View>
      ))}
    </View>
  )
}

/** §5.3 — skeleton đúng hình lưới tháng, không phải spinner giữa màn. */
function MonthSkeleton() {
  return (
    <Screen>
      <View className="h-3 w-40 rounded bg-surface-2" />
      <View className="mt-3.5 h-8 w-24 rounded bg-surface-2" />
      <View className="mt-6 flex-row flex-wrap">
        {Array.from({ length: 35 }, (_, i) => (
          <View key={i} style={CELL} className="items-center py-1">
            <View className="size-8 rounded-full bg-surface" />
          </View>
        ))}
      </View>
      <View className="mt-4 h-40 rounded-2xl bg-surface" />
    </Screen>
  )
}
