import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { ChevronDown } from "lucide-react-native"
import { WEEKDAYS } from "@/features/program/types/schema"
import {
  draftError,
  emptyExercise,
  toCustomProgramRequest,
  type Draft,
  type DraftExercise,
} from "@/features/schedule/utils/customProgram"
import type { Exercise } from "@/features/exercise/types"
import { cn } from "@/lib/cn"
import { range } from "@/lib/wheel"
import { Kicker } from "~/components/Kicker"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { PickerField } from "~/components/ui/Picker"
import { isoDay, START_OFFSETS, startLabel } from "~/lib/dates"
import { cleanDecimal } from "~/lib/number"
import { useCreateCustomProgram } from "~/features/schedule/useCustomProgram"
import { useExercises } from "~/features/schedule/useExercises"
import { colors } from "~/theme"

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

  const active = exercises.data?.filter((e) => e.active) ?? []
  const error = draftError(draft)

  function toggleDay(day: number) {
    setDraft((prev) => {
      const next = { ...prev }
      if (day in next) {
        delete next[day]
      } else {
        next[day] = active[0] ? [emptyExercise(active[0].id)] : []
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
    return <Text className="text-sm text-text-muted">Đang tải danh sách bài tập…</Text>
  }

  return (
    <View>
      <Kicker>Ngày tập trong tuần</Kicker>
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
        <View key={d.value} className="mt-5 rounded-xl bg-surface p-3.5">
          <Text className="text-[15px] font-bold text-text">Buổi {d.label}</Text>

          <View className="mt-3 gap-3">
            {draft[d.value].map((ex, i) => (
              <View key={i} className="gap-2 border-t border-border pt-3">
                <ExercisePicker
                  options={active}
                  value={ex.exerciseId}
                  onChange={(exerciseId) => patchExercise(d.value, i, { exerciseId })}
                />
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
                  hitSlop={8}
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
            onPress={() =>
              setDraft((prev) => ({
                ...prev,
                [d.value]: [...prev[d.value], emptyExercise(active[0].id)],
              }))
            }
            className="mt-3 h-10 items-center justify-center rounded-md border-[1.5px] border-dashed border-border"
          >
            <Text className="text-sm font-semibold text-text-muted">+ Thêm bài</Text>
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

      {error && <Text className="mt-3 text-xs text-danger">{error}</Text>}
      {createProgram.isError && (
        <Text className="mt-3 text-sm text-danger">Tạo lịch thất bại: {createProgram.error.message}</Text>
      )}

      {/* Người dùng chốt viết ngắn (09-26): chỉ hai điều cần biết trước khi bấm. */}
      <View className="mt-4 rounded-md border border-warn/30 bg-warn-tint px-3 py-2.5">
        <Text className="text-xs text-warn">Chương trình đang dùng sẽ dừng. Lịch này không tự tăng tải.</Text>
      </View>

      <Button
        className="mt-4 w-full"
        disabled={!!error || createProgram.isPending || createProgram.isSuccess}
        onPress={() =>
          createProgram.mutate(toCustomProgramRequest(draft, isoDay(startOffset), weeks), { onSuccess: onCreated })
        }
      >
        {createProgram.isPending ? "Đang tạo…" : "Tạo lịch"}
      </Button>
    </View>
  )
}

/** Web dùng <select>; trên điện thoại bấm ô để mở danh sách ngay dưới, chọn xong tự gập. */
function ExercisePicker({
  options,
  value,
  onChange,
}: {
  options: Exercise[]
  value: string
  onChange: (exerciseId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.id === value)
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bài tập: ${current ? (current.nameVi ?? current.nameEn) : "chưa chọn"}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5"
      >
        <Text className="flex-1 text-sm text-text">{current ? (current.nameVi ?? current.nameEn) : "Chọn bài"}</Text>
        <ChevronDown size={16} color={colors["text-muted"]} />
      </Pressable>
      {open && (
        <View className="mt-1 rounded-lg bg-bg px-3">
          {options.map((o, i) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              accessibilityState={{ selected: o.id === value }}
              onPress={() => {
                onChange(o.id)
                setOpen(false)
              }}
              className={cn("py-2.5", i > 0 && "border-t border-border")}
            >
              <Text className={cn("text-sm", o.id === value ? "font-bold text-accent" : "text-text")}>
                {o.nameVi ?? o.nameEn}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
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
      <Text className="text-[11px] text-text-muted">{label}</Text>
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
