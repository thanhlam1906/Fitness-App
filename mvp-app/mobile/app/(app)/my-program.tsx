import { useState, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter, type Href } from "expo-router"
import { CalendarOff, ChevronRight, CloudOff, LayoutTemplate, Pencil, PencilRuler } from "lucide-react-native"
import { formatTarget, programDays, shortDayTitle, type ProgramDay } from "@/features/schedule/utils/programDays"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { parseIso, toIso, WEEKDAY_LABELS, weekProgress } from "@/features/schedule/utils/weeks"
import { cn } from "@/lib/cn"
import { ApiError } from "~/api/client"
import { BackLink } from "~/components/BackLink"
import { ExerciseImage } from "~/components/ExerciseImage"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"
import { Skeleton } from "~/components/ui/Skeleton"
import { StatusBlock } from "~/components/StatusViews"
import { useCurrentProgram } from "~/features/program/api/useCurrentProgram"
import { ExerciseGuideSheet } from "~/features/schedule/components/ExerciseGuideSheet"
import { TrainingDaysSheet } from "~/features/schedule/components/TrainingDaysSheet"
import { useSchedule } from "~/features/schedule/api/useSchedule"
import { ProgramDayEditSheet } from "~/features/schedule/components/WorkoutEditor"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

const OPTIONS: { Icon: typeof LayoutTemplate; title: string; desc: string; to: Href }[] = [
  { Icon: LayoutTemplate, title: "Đổi chương trình mẫu", desc: "Chọn từ các chương trình soạn sẵn. App tự tăng tải theo luật.", to: "/program" },
  { Icon: PencilRuler, title: "Tự thiết kế lịch riêng", desc: "Tự chọn ngày tập, bài và con số. App không tự tăng tải.", to: "/my-schedule" },
]

const dayMonth = (iso: string) => {
  const d = parseIso(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * "Chương trình của tôi" (doc/design-chuong-trinh-v1.md, mockup doc/mockup-program/demo.html) — bản
 * mobile của MyProgramPage web: cả chương trình một lượt theo loại buổi, sửa một loại buổi, đổi ngày tập.
 */
export default function MyProgramScreen() {
  const router = useRouter()
  const schedule = useSchedule()
  const program = useCurrentProgram()
  const [editing, setEditing] = useState<ProgramDay | null>(null)
  const [daysOpen, setDaysOpen] = useState(false)
  const [guide, setGuide] = useState<ScheduledExerciseView | null>(null)

  if (schedule.isLoading || program.isLoading) {
    return <MyProgramSkeleton />
  }
  if ([schedule.error, program.error].some((e) => e instanceof ApiError && e.status === 404)) {
    return (
      <Screen>
        <StatusBlock icon={CalendarOff} title="Chưa có chương trình">
          <Button onPress={() => router.push("/program")}>Chọn chương trình</Button>
        </StatusBlock>
      </Screen>
    )
  }
  if (schedule.isError || program.isError) {
    return (
      <Screen>
        <StatusBlock icon={CloudOff} tone="danger" title="Không tải được chương trình">
          <Button
            variant="secondary"
            onPress={() => {
              schedule.refetch()
              program.refetch()
            }}
          >
            Thử lại
          </Button>
        </StatusBlock>
      </Screen>
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
    <Screen>
      <BackLink label="Lịch" fallback="/schedule" />
      <Kicker className="mt-3.5">Chương trình đang dùng</Kicker>
      <Text className="mt-2 text-[28px] font-extrabold leading-[34px] tracking-[-0.5px] text-text">{current.templateName}</Text>
      <Text className="mt-2 text-[13px] text-text-muted" style={NUM}>
        {progress.weekIndex !== null && `Tuần ${progress.weekIndex}/${progress.totalWeeks} · `}
        từ <Text className="font-semibold text-text">{dayMonth(startDate)}</Text>
        {lastDate && (
          <>
            {" "}đến <Text className="font-semibold text-text">{dayMonth(lastDate)}</Text>
          </>
        )}
      </Text>
      <View className={cn("mt-2.5 self-start rounded-full px-2 py-0.5", isCustom ? "bg-surface-2" : "bg-accent-tint")}>
        <Text className={cn("text-[11px] font-bold", isCustom ? "text-text-muted" : "text-accent")}>
          {isCustom ? "Không tự tăng tải" : "Tự tăng tải theo luật"}
        </Text>
      </View>

      <SectionTitle
        action={
          !isCustom && (
            <Pressable accessibilityRole="button" onPress={() => setDaysOpen(true)} hitSlop={8}>
              <Text className="px-1 text-[13px] font-bold text-accent">Đổi</Text>
            </Pressable>
          )
        }
      >
        Ngày tập trong tuần
      </SectionTitle>
      <View className="flex-row gap-1.5">
        {WEEKDAY_LABELS.map((w, i) => {
          const on = trainingDays.includes(i + 1)
          return (
            <View
              key={w}
              accessibilityLabel={`${w}: ${on ? "ngày tập" : "nghỉ"}`}
              className={cn("h-9 flex-1 items-center justify-center rounded-md", on ? "bg-accent-tint" : "bg-surface opacity-60")}
            >
              <Text className={cn("text-[13px] font-bold", on ? "text-accent" : "text-text-muted")}>{w}</Text>
            </View>
          )
        })}
      </View>
      {isCustom && (
        <Text className="mt-3 text-xs leading-5 text-text-muted">
          Lịch tự thiết kế gắn bài theo thứ. Muốn đổi ngày thì thiết kế lại ở cuối trang.
        </Text>
      )}

      <SectionTitle>{isCustom ? "Các buổi trong tuần" : "Các buổi · lặp lại theo thứ tự"}</SectionTitle>
      {days.map((day) => (
        <ProgramDayCard key={day.label} day={day} onEdit={() => setEditing(day)} onGuide={setGuide} />
      ))}

      <SectionTitle>Đổi cả chương trình</SectionTitle>
      {OPTIONS.map(({ Icon, title, desc, to }) => (
        <Pressable
          key={title}
          accessibilityRole="link"
          onPress={() => router.push(to)}
          className="mt-2.5 flex-row items-center gap-3 rounded-lg border border-border bg-surface p-3.5"
        >
          <View className="size-[42px] items-center justify-center rounded-md bg-accent-tint">
            <Icon size={22} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-text">{title}</Text>
            <Text className="mt-0.5 text-xs leading-4 text-text-muted">{desc}</Text>
          </View>
          <ChevronRight size={18} color={colors["text-muted"]} />
        </Pressable>
      ))}

      {editing?.next && (
        <ProgramDayEditSheet
          label={editing.label}
          remaining={editing.remaining}
          workout={editing.next}
          open
          onClose={() => setEditing(null)}
        />
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
    </Screen>
  )
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View className="mb-2.5 mt-6 flex-row items-center justify-between">
      <Kicker>{children}</Kicker>
      {action}
    </View>
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
    <View className="mt-2.5 rounded-lg border border-border bg-surface p-3.5">
      <View className="flex-row items-start justify-between gap-2.5">
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-text">Buổi {day.label}</Text>
          <Text className="mt-0.5 text-xs text-text-muted" style={NUM}>
            {day.next ? `Còn ${day.remaining} buổi · tiếp theo ${shortDayTitle(day.next.scheduledOn)}` : "Đã tập hết"}
          </Text>
        </View>
        {day.next && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa buổi ${day.label}`}
            onPress={onEdit}
            className="h-8 flex-row items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3"
          >
            <Pencil size={14} color={colors.text} />
            <Text className="text-[13px] font-bold text-text">Sửa</Text>
          </Pressable>
        )}
      </View>
      <View className="mt-2.5">
        {day.exercises.map((ex) => (
          <Pressable
            key={ex.id}
            accessibilityRole="button"
            onPress={() => onGuide(ex)}
            className="flex-row items-center gap-2.5 border-t border-border py-2.5"
          >
            <ExerciseImage slug={ex.exerciseSlug} alt="" variant="thumb" />
            <Text className="flex-1 text-sm text-text">{ex.exerciseName}</Text>
            <Text className="text-[13px] text-text-muted" style={NUM}>
              {formatTarget(ex)}
            </Text>
            <ChevronRight size={16} color={colors["text-muted"]} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** Cùng khung với màn: nút Lịch, tiêu đề chương trình, 7 ô ngày, các thẻ buổi, hai lối đổi chương trình. */
function MyProgramSkeleton() {
  return (
    <Screen>
      <View accessible accessibilityLabel="Đang tải">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="mt-3.5 h-3 w-36" />
        <Skeleton className="mt-2 h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-2.5 h-5 w-32 rounded-full" />
        <Skeleton className="mb-2.5 mt-6 h-3 w-40" />
        <View className="flex-row gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-9 flex-1" />
          ))}
        </View>
        <Skeleton className="mb-2.5 mt-6 h-3 w-48" />
        <Skeleton className="mt-2.5 h-44 rounded-[14px]" />
        <Skeleton className="mt-2.5 h-44 rounded-[14px]" />
        <Skeleton className="mb-2.5 mt-6 h-3 w-40" />
        <Skeleton className="mt-2.5 h-[72px] rounded-[14px]" />
        <Skeleton className="mt-2.5 h-[72px] rounded-[14px]" />
      </View>
    </Screen>
  )
}
