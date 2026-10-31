import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { ChevronDown, Plus, TriangleAlert } from "lucide-react-native"
import { WEEKDAYS } from "@/features/program/types/schema"
import {
  draftError,
  emptyExercise,
  toCustomProgramRequest,
  type Draft,
  type DraftExercise,
} from "@/features/schedule/utils/customProgram"
import { cn } from "@/lib/cn"
import { range } from "@/lib/wheel"
import { SectionTitle } from "~/components/SectionTitle"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { PickerField } from "~/components/ui/Picker"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"
import { Skeleton } from "~/components/ui/Skeleton"
import { ExercisePicker } from "~/features/schedule/components/ExercisePicker"
import { isoDay, START_OFFSETS, startLabel } from "~/lib/dates"
import { cleanDecimal } from "~/lib/number"
import { useCreateCustomProgram } from "~/features/schedule/api/useCustomProgram"
import { useExercises } from "~/features/exercise/api/useExercises"
import { colors } from "~/theme"
import { IconText, Notice } from "~/components/StatusViews"

const WEEKS = range(1, 12)

/**
 * Tự thiết kế lịch: chọn thứ nào tập, mỗi thứ thêm bài và tự đặt set/rep/tạ — bản mobile của
 * ScheduleBuilder web. Cấu trúc gắn với thứ trong tuần nên tuần nào cũng lặp lại y hệt, không có
 * progression tự động: người dùng đã tự quyết con số.
 */
export function ScheduleBuilder({ onCreated }: { onCreated: () => void }) {
  const exercises = useExercises()
  const createProgram = useCreateCustomProgram()

  const [draft, setDraft] = useState<Draft>({})
  const [startOffset, setStartOffset] = useState(0)
  const [weeks, setWeeks] = useState(4)
  // Dòng đang chọn bài trong khung: index = null là thêm dòng mới cho ngày đó.
  const [picking, setPicking] = useState<{ day: number; index: number | null } | null>(null)

  const active = exercises.data?.filter((e) => e.active) ?? []
  const nameOf = (id: string) => active.find((e) => e.id === id)?.nameEn ?? "Chọn bài"
  const error = draftError(draft)

  function toggleDay(day: number) {
    setDraft((prev) => {
      const next = { ...prev }
      if (day in next) {
        delete next[day]
      } else {
        // Để trống, người dùng tự chọn bài: gán sẵn bài đầu danh sách là chốt hộ một bài họ không chọn.
        next[day] = []
      }
      return next
    })
  }

  function patchExercise(day: number, index: number, patch: Partial<DraftExercise>) {
    setDraft((prev) => ({
      ...prev,
      [day]: prev[day].map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    }))
  }

  if (exercises.isLoading) {
    // Khung của form: tiêu đề mục + 7 nút thứ, hàng ngày bắt đầu/số tuần, cảnh báo, nút tạo.
    return (
      <View accessible accessibilityLabel="Đang tải">
        <Skeleton className="h-3 w-40" />
        <View className="mt-2.5 flex-row gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-[42px] flex-1 rounded-lg" />
          ))}
        </View>
        <View className="mt-5 flex-row gap-3">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 w-28" />
        </View>
        <Skeleton className="mt-4 h-10" />
        <Skeleton className="mt-4 h-11" />
      </View>
    )
  }

  return (
    <View>
      <SectionTitle>Ngày tập trong tuần</SectionTitle>
      <View className="mt-2.5 flex-row gap-1.5">
        {WEEKDAYS.map((d) => {
          const on = d.value in draft
          return (
            <Pressable
              key={d.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggleDay(d.value)}
              className={cn("flex-1 items-center rounded-lg py-3", on ? "bg-accent" : "bg-surface")}
            >
              <Text className={cn("text-[13px]", on ? "font-bold text-accent-fg" : "text-text-muted")}>{d.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {WEEKDAYS.filter((d) => d.value in draft).map((d) => (
        <View key={d.value} className="mt-5 rounded-lg bg-surface p-3.5">
          <Text className="text-[15px] font-bold text-text">Buổi {d.label}</Text>

          <View className="mt-3 gap-3">
            {draft[d.value].map((ex, i) => (
              <View key={i} className="gap-2 border-t border-border pt-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bài tập: ${nameOf(ex.exerciseId)}. Bấm để đổi`}
                  onPress={() => setPicking({ day: d.value, index: i })}
                  className="h-11 flex-row items-center justify-between gap-2 rounded-md bg-surface-2 px-3"
                >
                  <Text className="flex-1 text-[15px] font-semibold text-text" numberOfLines={1}>
                    {nameOf(ex.exerciseId)}
                  </Text>
                  <ChevronDown size={18} color={colors["text-muted"]} />
                </Pressable>
                <View className="flex-row gap-2">
                  <NumberField label="Set" value={ex.sets} onChange={(v) => patchExercise(d.value, i, { sets: v })} />
                  <NumberField label="Rep từ" value={ex.repsMin} onChange={(v) => patchExercise(d.value, i, { repsMin: v })} />
                  <NumberField label="Rep đến" value={ex.repsMax} onChange={(v) => patchExercise(d.value, i, { repsMax: v })} />
                  <NumberField
                    label="Tạ (kg)"
                    decimal
                    value={ex.loadKg}
                    onChange={(v) => patchExercise(d.value, i, { loadKg: v })}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="self-start"
                  hitSlop={12}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      [d.value]: prev[d.value].filter((_, index) => index !== i),
                    }))
                  }
                >
                  <Text className="text-xs text-danger">Xoá bài này</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking({ day: d.value, index: null })}
            className="mt-3 h-11 flex-row items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed border-border"
          >
            <Plus size={16} color={colors.text} />
            <Text className="text-sm font-bold text-text">Thêm bài</Text>
          </Pressable>
        </View>
      ))}

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 gap-1.5">
          <Label>Ngày bắt đầu</Label>
          <PickerField
            title="Ngày bắt đầu"
            columns={[START_OFFSETS]}
            value={[startOffset]}
            start={[0]}
            display={startLabel(startOffset)}
            formatValue={startLabel}
            onChange={([offset]) => setStartOffset(offset)}
          />
        </View>
        <View className="w-28 gap-1.5">
          <Label>Số tuần</Label>
          <PickerField
            title="Số tuần"
            columns={[WEEKS]}
            value={[weeks]}
            start={[4]}
            display={`${weeks} tuần`}
            onChange={([w]) => setWeeks(w)}
          />
        </View>
      </View>

      {error && (
        <IconText small className="mt-3">
          {error}
        </IconText>
      )}
      {createProgram.isError && (
        <IconText className="mt-3">Tạo lịch thất bại: {createProgram.error.message}</IconText>
      )}

      {/* Người dùng chốt viết ngắn (09-26): chỉ hai điều cần biết trước khi bấm. */}
      <Notice icon={TriangleAlert} tone="warn" className="mt-4 border border-warn/30" textClassName="text-xs">
        Chương trình đang dùng sẽ dừng. Lịch này không tự tăng tải.
      </Notice>

      <Button
        className="mt-4 w-full"
        disabled={!!error || createProgram.isPending || createProgram.isSuccess}
        onPress={() =>
          createProgram.mutate(toCustomProgramRequest(draft, isoDay(startOffset), weeks), { onSuccess: onCreated })
        }
      >
        {createProgram.isPending ? "Đang tạo…" : "Tạo lịch"}
      </Button>

      <Sheet open={picking !== null} onClose={() => setPicking(null)} label="Chọn bài">
        <SheetHeader title="Chọn bài" onCancel={() => setPicking(null)} />
        <ExercisePicker
          autoFocus
          // Bỏ bài đã có trong ngày đó: set_logs khoá theo (buổi, bài, số set), hai dòng cùng bài đè set của nhau.
          exercises={active.filter(
            (e) => !picking || !draft[picking.day]?.some((x, i) => i !== picking.index && x.exerciseId === e.id),
          )}
          onPick={(exercise) => {
            if (!picking) return
            const { day, index } = picking
            if (index === null) {
              setDraft((prev) => ({ ...prev, [day]: [...prev[day], emptyExercise(exercise.id)] }))
            } else {
              patchExercise(day, index, { exerciseId: exercise.id })
            }
            setPicking(null)
          }}
        />
      </Sheet>
    </View>
  )
}

function NumberField({
  label,
  value,
  decimal,
  onChange,
}: {
  label: string
  value: string
  decimal?: boolean
  onChange: (value: string) => void
}) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-xs font-medium text-text-muted">{label}</Text>
      <Input
        accessibilityLabel={label}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        style={{ fontVariant: ["tabular-nums"] }}
        value={value}
        // customProgram.ts (dùng chung với web) đọc bằng Number(): chỉ giữ chữ số và một dấu chấm thập phân.
        onChangeText={(v) => onChange(decimal ? cleanDecimal(v).replace(",", ".") : v.replace(/\D/g, ""))}
      />
    </View>
  )
}
