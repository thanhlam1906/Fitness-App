import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { X } from "lucide-react-native"
import { diffDraft, nudge, toDraft, type DraftRow } from "@/features/schedule/utils/editDraft"
import { shortDayTitle } from "@/features/schedule/utils/programDays"
import type { ScheduledExerciseView, ScheduledWorkoutView } from "@/features/schedule/types"
import { formatDayMonth } from "@/lib/format"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"
import {
  useAddScheduledExercise,
  useEditProgramDay,
  useRemoveScheduledExercise,
  useUpdateScheduledExercise,
  type ExerciseTarget,
} from "~/features/schedule/api/useEditSchedule"
import { useExercises } from "~/features/exercise/api/useExercises"
import { colors } from "~/theme"

type SaveFn = (changes: ReturnType<typeof diffDraft>, setRows: Dispatch<SetStateAction<DraftRow[]>>) => Promise<void>

/**
 * Khung "Sửa buổi này" của màn Lịch (doc/design-ui-m3-v1.md §3) — bản mobile của WorkoutEditor web.
 * Sửa ĐÚNG buổi này: backend chỉ đổi dòng scheduled_exercises của buổi đang mở. Buổi đã tập
 * backend trả 409.
 */
export function WorkoutEditSheet({
  workout,
  open,
  onClose,
}: {
  workout: ScheduledWorkoutView
  open: boolean
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const update = useUpdateScheduledExercise()
  const add = useAddScheduledExercise()
  const remove = useRemoveScheduledExercise()

  // Gọi lần lượt để bài thêm vào giữ đúng thứ tự. Mỗi bước xong thì ghi vào nháp, để lỗi giữa
  // chừng rồi bấm Lưu lại không xoá lại bài đã xoá hay thêm trùng bài đã thêm.
  const save: SaveFn = async (changes, setRows) => {
    for (const id of changes.removes) {
      await remove.mutateAsync(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
    }
    for (const r of changes.updates) {
      await update.mutateAsync({
        id: r.id!,
        targetSets: r.sets,
        targetReps: r.reps,
        targetRepsMax: r.repsMax,
        targetLoadKg: r.loadKg,
        restSeconds: r.restSeconds,
      })
    }
    for (const r of changes.adds) {
      const created = await add.mutateAsync({
        workoutId: workout.id,
        exerciseId: r.exerciseId,
        targetSets: r.sets,
        targetReps: r.reps,
        targetRepsMax: r.repsMax,
        targetLoadKg: r.loadKg,
        restSeconds: null,
      })
      setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, id: (created as { id: string }).id } : x)))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label={`Sửa buổi ${workout.label ?? ""}`} dismissible={!saving}>
      {/* Thân khung dựng lại mỗi lần mở: nháp luôn bắt đầu từ lịch hiện tại. */}
      <EditBody
        title={`Sửa buổi ${workout.label ?? ""}`}
        subtitle={`${formatDayMonth(workout.scheduledOn)} · chỉ đổi buổi này, các buổi khác giữ nguyên`}
        addLabel="Thêm bài vào buổi này"
        exercises={workout.exercises}
        onSave={save}
        onClose={onClose}
        saving={saving}
        setSaving={setSaving}
      />
    </Sheet>
  )
}

/**
 * "Sửa buổi {nhãn}" ở màn Chương trình (doc/design-chuong-trinh-v1.md §3.1): áp cho mọi buổi mở
 * cùng nhãn. Một lời gọi, một transaction: lỗi thì không buổi nào đổi, nháp giữ để Lưu lại.
 */
export function ProgramDayEditSheet({
  label,
  remaining,
  workout,
  open,
  onClose,
}: {
  label: string
  remaining: number
  workout: ScheduledWorkoutView
  open: boolean
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const edit = useEditProgramDay()
  const target = (r: DraftRow): ExerciseTarget => ({
    exerciseId: r.exerciseId,
    targetSets: r.sets,
    targetReps: r.reps,
    targetRepsMax: r.repsMax,
    targetLoadKg: r.loadKg,
  })
  const save: SaveFn = async (changes) => {
    // diffDraft chỉ trả id có trong danh sách gốc, nên tra ra exerciseId luôn có.
    const exerciseOf = new Map(workout.exercises.map((e) => [e.id, e.exerciseId]))
    await edit.mutateAsync({
      label,
      remove: changes.removes.map((id) => exerciseOf.get(id)!),
      update: changes.updates.map(target),
      add: changes.adds.map(target),
    })
  }
  return (
    <Sheet open={open} onClose={onClose} label={`Sửa buổi ${label}`} dismissible={!saving}>
      <EditBody
        title={`Sửa buổi ${label}`}
        subtitle={`Áp cho ${remaining} buổi ${label} còn lại, từ ${shortDayTitle(workout.scheduledOn)}.\nBuổi đã tập giữ nguyên.`}
        addLabel={`Thêm bài vào buổi ${label}`}
        note='Muốn đổi một ngày thôi? Mở ngày đó ở Lịch rồi chọn "Sửa buổi này".'
        exercises={workout.exercises}
        onSave={save}
        onClose={onClose}
        saving={saving}
        setSaving={setSaving}
      />
    </Sheet>
  )
}

function EditBody({
  title,
  subtitle,
  addLabel,
  note,
  exercises: original,
  onSave,
  onClose,
  saving,
  setSaving,
}: {
  title: string
  subtitle: string
  addLabel: string
  note?: string
  exercises: ScheduledExerciseView[]
  onSave: SaveFn
  onClose: () => void
  saving: boolean
  setSaving: (saving: boolean) => void
}) {
  const exercises = useExercises()
  const [rows, setRows] = useState<DraftRow[]>(() => toDraft(original))
  const [error, setError] = useState<string | null>(null)
  // Web dùng <select>; trên điện thoại mở danh sách ngay trong khung, không chồng thêm khung thứ hai.
  const [picking, setPicking] = useState(false)

  const changes = diffDraft(original, rows)
  const dirty = changes.updates.length + changes.adds.length + changes.removes.length > 0
  // Không cho thêm bài đã có trong buổi: set_logs khoá theo (buổi, bài, số set), hai dòng cùng bài
  // sẽ đè set của nhau khi tập.
  const taken = new Set(rows.filter((r) => !r.removed).map((r) => r.exerciseId))
  const active = exercises.data?.filter((e) => e.active && !taken.has(e.id)) ?? []

  function patch(key: string, fn: (row: DraftRow) => DraftRow) {
    setRows((prev) => prev.map((r) => (r.key === key ? fn(r) : r)))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await onSave(changes, setRows)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SheetHeader
        title={title}
        confirmLabel={saving ? "Đang lưu…" : "Lưu"}
        confirmDisabled={!dirty || saving}
        onCancel={() => !saving && onClose()}
        onConfirm={save}
      />
      <Text className="px-4 pb-2.5 text-center text-xs leading-5 text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
        {subtitle}
      </Text>
      <ScrollView className="px-4" contentContainerClassName="pb-4" keyboardShouldPersistTaps="handled">
        <View className="gap-2.5">
          {rows
            .filter((r) => !r.removed)
            .map((r) => (
              <View key={r.key} className="rounded-lg bg-bg p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-[15px] font-bold text-text">{r.name}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xoá ${r.name} khỏi buổi này`}
                    onPress={() => patch(r.key, (row) => ({ ...row, removed: true }))}
                    className="size-8 items-center justify-center rounded-sm bg-surface"
                  >
                    <X size={16} color={colors["text-muted"]} />
                  </Pressable>
                </View>
                <View className="mt-2.5 flex-row flex-wrap gap-2">
                  <Stepper label="Set" value={String(r.sets)} onStep={(d) => patch(r.key, (row) => nudge(row, "sets", d))} />
                  <Stepper
                    label="Tạ (kg)"
                    value={r.loadKg === null ? "—" : String(r.loadKg).replace(".", ",")}
                    onStep={(d) => patch(r.key, (row) => nudge(row, "loadKg", d))}
                  />
                  <Stepper label="Rep từ" value={String(r.reps)} onStep={(d) => patch(r.key, (row) => nudge(row, "reps", d))} />
                  <Stepper
                    label="Rep đến"
                    value={String(r.repsMax)}
                    onStep={(d) => patch(r.key, (row) => nudge(row, "repsMax", d))}
                  />
                </View>
              </View>
            ))}
        </View>

        {active.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: picking }}
            onPress={() => setPicking((p) => !p)}
            className="mt-3 h-12 items-center justify-center rounded-lg border-[1.5px] border-dashed border-border"
          >
            <Text className="text-sm font-semibold text-text-muted">+ {addLabel}</Text>
          </Pressable>
        )}
        {picking && (
          <View className="mt-2 rounded-md bg-bg px-3">
            {active.map((option, i) => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                onPress={() => {
                  setRows((prev) => [
                    ...prev,
                    {
                      key: `new-${option.id}-${prev.length}`,
                      id: null,
                      exerciseId: option.id,
                      name: option.nameVi ?? option.nameEn,
                      sets: 3,
                      reps: 8,
                      repsMax: 12,
                      loadKg: null,
                      restSeconds: null,
                      removed: false,
                    },
                  ])
                  setPicking(false)
                }}
                className={i > 0 ? "border-t border-border py-3" : "py-3"}
              >
                <Text className="text-sm text-text">{option.nameVi ?? option.nameEn}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text className="mt-3 text-xs text-text-muted">Tạ mỗi lần bấm đổi 2,5 kg.</Text>
        {note && <Text className="mt-1.5 text-xs text-text-muted">{note}</Text>}
        {error && <Text className="mt-2 text-sm text-danger">Lưu thất bại: {error}</Text>}
      </ScrollView>
    </>
  )
}

function Stepper({ label, value, onStep }: { label: string; value: string; onStep: (dir: 1 | -1) => void }) {
  return (
    // Hai ô một hàng như lưới 2 cột của web.
    <View style={{ width: "48.5%" }}>
      <Text className="mb-1 text-[11px] text-text-muted">{label}</Text>
      <View className="h-10 flex-row items-center justify-between rounded-md border border-border bg-surface px-1">
        <StepButton label={`Giảm ${label}`} onPress={() => onStep(-1)}>
          −
        </StepButton>
        <Text
          accessibilityLiveRegion="polite"
          className="text-[15px] font-extrabold text-text"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
        <StepButton label={`Tăng ${label}`} onPress={() => onStep(1)}>
          +
        </StepButton>
      </View>
    </View>
  )
}

function StepButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-8 items-center justify-center rounded-sm bg-surface-2"
    >
      <Text className="text-lg font-bold text-text">{children}</Text>
    </Pressable>
  )
}
