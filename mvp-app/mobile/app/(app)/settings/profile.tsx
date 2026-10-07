import { useState, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GOALS, HEIGHT_CM, WEIGHT_KG, labelOf } from "@/features/profile/types"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"
import { Checkbox } from "~/components/ui/Checkbox"
import { MetricEditor } from "~/features/profile/components/MetricEditor"
import { LoadState, SettingsSubLayout } from "~/features/profile/components/SettingsSubLayout"
import { usePatchProfile, useProfile, useSaveBodyMetric } from "~/features/profile/api/useProfile"

/**
 * Cài đặt › Hồ sơ — bản mobile của ProfilePage web. Danh sách dòng CHỈ ĐỌC, bấm "Sửa" mở ô nhập tại
 * chỗ: mở ra là đọc được số của mình, không phải nhìn một trang toàn form.
 */
export default function ProfileScreen() {
  const profile = useProfile()
  const patch = usePatchProfile()
  const saveBodyMetric = useSaveBodyMetric()

  if (!profile.data) {
    return (
      <SettingsSubLayout title="Hồ sơ">
        <LoadState error={profile.error} />
      </SettingsSubLayout>
    )
  }

  const data = profile.data
  const metric = data.latestBodyMetric

  return (
    <SettingsSubLayout title="Hồ sơ">
      <View className="mt-5 gap-2">
        <EditableRow label="Cân nặng" value={formatKg(metric?.weightKg)} actionLabel="Cập nhật" accent>
          {(close) => (
            <MetricEditor
              unit="kg"
              decimal
              {...WEIGHT_KG}
              initial={metric?.weightKg}
              pending={saveBodyMetric.isPending}
              onSave={(weightKg) => saveBodyMetric.mutate({ weightKg }, { onSuccess: close })}
            />
          )}
        </EditableRow>

        <EditableRow label="Chiều cao" value={metric?.heightCm == null ? "—" : `${metric.heightCm} cm`}>
          {(close) => (
            <MetricEditor
              unit="cm"
              decimal
              {...HEIGHT_CM}
              initial={metric?.heightCm}
              pending={saveBodyMetric.isPending}
              onSave={(heightCm) => saveBodyMetric.mutate({ heightCm }, { onSuccess: close })}
            />
          )}
        </EditableRow>

        <EditableRow label="Mục tiêu" value={labelOf(GOALS, data.goal)}>
          {(close) => (
            <ChoiceEditor options={GOALS} value={data.goal} onSave={(goal) => patch.mutate({ goal }, { onSuccess: close })} />
          )}
        </EditableRow>

        <EditableRow label="Kinh nghiệm" value={labelOf(EXPERIENCE_LEVELS, data.experience)}>
          {(close) => (
            <ChoiceEditor
              options={EXPERIENCE_LEVELS}
              value={data.experience}
              onSave={(experience) => patch.mutate({ experience }, { onSuccess: close })}
            />
          )}
        </EditableRow>

        <EditableRow label="Số buổi mỗi tuần" value={data.sessionsPerWeek == null ? "—" : `${data.sessionsPerWeek} buổi`}>
          {(close) => (
            <MetricEditor
              unit="buổi"
              min={2}
              max={6}
              initial={data.sessionsPerWeek}
              pending={patch.isPending}
              onSave={(sessionsPerWeek) => patch.mutate({ sessionsPerWeek }, { onSuccess: close })}
            />
          )}
        </EditableRow>

        <EditableRow
          label="Thiết bị"
          value={data.equipment.length === 0 ? "Chưa khai" : data.equipment.map((e) => labelOf(EQUIPMENT_OPTIONS, e)).join(", ")}
        >
          {() => (
            <View className="gap-2.5">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const on = data.equipment.includes(eq.value)
                return (
                  <Checkbox
                    key={eq.value}
                    checked={on}
                    className="items-center"
                    onChange={(checked) =>
                      patch.mutate({
                        equipment: checked ? [...data.equipment, eq.value] : data.equipment.filter((v) => v !== eq.value),
                      })
                    }
                  >
                    <Text className="text-sm text-text">{eq.label}</Text>
                  </Checkbox>
                )
              })}
            </View>
          )}
        </EditableRow>
      </View>

      {patch.isError && <Text className="mt-4 text-sm text-danger">Lưu thất bại: {patch.error.message}</Text>}
      {saveBodyMetric.isError && <Text className="mt-4 text-sm text-danger">Lưu thất bại: {saveBodyMetric.error.message}</Text>}
    </SettingsSubLayout>
  )
}

/** Dòng chỉ đọc, bấm "Sửa" thì mở ô nhập ngay dưới — không nhảy sang màn khác. */
function EditableRow({
  label,
  value,
  actionLabel = "Sửa",
  accent = false,
  children,
}: {
  label: string
  value: string
  actionLabel?: string
  accent?: boolean
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <View className="rounded-md bg-surface p-3.5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[11px] text-text-muted">{label}</Text>
          <Text className="mt-0.5 text-[19px] font-bold text-text" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
            {value}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${open ? "Đóng" : actionLabel} ${label}`} onPress={() => setOpen((o) => !o)} hitSlop={8}>
          <Text className={cn("text-[13px]", accent ? "text-accent" : "text-text-muted")}>{open ? "Đóng" : actionLabel}</Text>
        </Pressable>
      </View>
      {open && <View className="mt-3.5">{children(() => setOpen(false))}</View>}
    </View>
  )
}

function ChoiceEditor({
  options,
  value,
  onSave,
}: {
  options: readonly { value: string; label: string }[]
  value: string | null
  onSave: (value: string) => void
}) {
  return (
    <View className="gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onSave(o.value)}
            className={cn("rounded-md border p-3", on ? "border-accent bg-surface-2" : "border-border")}
          >
            <Text className={cn("text-sm", on ? "text-text" : "text-text-muted")}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
