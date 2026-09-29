import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"
import { LoadState, SettingsSubPage } from "./SettingsSubPage"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GOALS, HEIGHT_CM, WEIGHT_KG, labelOf } from "./types"
import { useProfile, usePatchProfile, useSaveBodyMetric } from "./useProfile"

/**
 * Cài đặt › Hồ sơ — đúng các dòng của màn Hồ sơ cũ (màn 10 concept-frontend-v1.md), chỉ chuyển
 * vào màn con (doc/design-cai-dat-v1.md). Danh sách dòng CHỈ ĐỌC, bấm "Sửa" mở ô nhập tại chỗ:
 * mở ra là đọc được số của mình, không phải nhìn một trang toàn form.
 *
 * Design có thêm công tắc "Gửi clip để chấm form" ở đây — không dựng. C4 §4 chốt opt-in nằm ở
 * màn hướng dẫn quay (màn 8) và KHÔNG ở nơi nào khác.
 */
export function ProfilePage() {
  const profile = useProfile()
  const patch = usePatchProfile()
  const saveBodyMetric = useSaveBodyMetric()

  if (!profile.data) {
    return (
      <SettingsSubPage title="Hồ sơ">
        <LoadState error={profile.error} />
      </SettingsSubPage>
    )
  }

  const data = profile.data
  const metric = data.latestBodyMetric

  return (
    <SettingsSubPage title="Hồ sơ">
      <div className="mt-5 flex flex-col gap-2">
        <EditableRow label="Cân nặng" value={formatKg(metric?.weightKg)} actionLabel="Cập nhật" accent>
          {(close) => (
            <MetricEditor
              unit="kg"
              step="0.1"
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
              step="0.5"
              {...HEIGHT_CM}
              initial={metric?.heightCm}
              pending={saveBodyMetric.isPending}
              onSave={(heightCm) => saveBodyMetric.mutate({ heightCm }, { onSuccess: close })}
            />
          )}
        </EditableRow>

        <EditableRow label="Mục tiêu" value={labelOf(GOALS, data.goal)}>
          {(close) => (
            <ChoiceEditor
              options={GOALS}
              value={data.goal}
              onSave={(goal) => patch.mutate({ goal }, { onSuccess: close })}
            />
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

        <EditableRow
          label="Số buổi mỗi tuần"
          value={data.sessionsPerWeek == null ? "—" : `${data.sessionsPerWeek} buổi`}
        >
          {(close) => (
            <MetricEditor
              unit="buổi"
              step="1"
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
          value={
            data.equipment.length === 0
              ? "Chưa khai"
              : data.equipment.map((e) => labelOf(EQUIPMENT_OPTIONS, e)).join(", ")
          }
        >
          {() => (
            <div className="flex flex-col gap-2.5">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <label key={eq.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={data.equipment.includes(eq.value)}
                    onChange={(e) =>
                      patch.mutate({
                        equipment: e.target.checked
                          ? [...data.equipment, eq.value]
                          : data.equipment.filter((v) => v !== eq.value),
                      })
                    }
                  />
                  {eq.label}
                </label>
              ))}
            </div>
          )}
        </EditableRow>
      </div>

      {patch.isError && (
        <p className="mt-4 text-sm text-[var(--color-danger)]">Lưu thất bại: {patch.error.message}</p>
      )}
      {saveBodyMetric.isError && (
        <p className="mt-4 text-sm text-[var(--color-danger)]">Lưu thất bại: {saveBodyMetric.error.message}</p>
      )}
    </SettingsSubPage>
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
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
          <div className="num mt-0.5 truncate text-[19px] font-bold">{value}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex-none rounded-[var(--radius-sm)] text-[13px]",
            accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
            SHEET_FOCUS,
          )}
        >
          {open ? "Đóng" : actionLabel}
        </button>
      </div>
      {open && <div className="mt-3.5">{children(() => setOpen(false))}</div>}
    </div>
  )
}

/** Ô nhập một số + nút Lưu. Dùng lại ở màn Lịch sử cân nặng. */
export function MetricEditor({
  unit,
  step,
  min,
  max,
  initial,
  pending,
  onSave,
}: {
  unit: string
  step: string
  min?: number
  max?: number
  initial: number | null | undefined
  pending: boolean
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState(initial?.toString() ?? "")
  const parsed = Number(value)
  const valid =
    value !== "" &&
    !Number.isNaN(parsed) &&
    (min == null || parsed >= min) &&
    (max == null || parsed <= max)

  return (
    <div className="flex items-center gap-2.5">
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        aria-label={unit}
        className="num w-32"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>
      <Button size="sm" disabled={!valid || pending} onClick={() => onSave(parsed)}>
        {pending ? "Đang lưu…" : "Lưu"}
      </Button>
    </div>
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
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSave(o.value)}
          className={cn(
            "rounded-[var(--radius-md)] border p-3 text-left text-sm",
            o.value === value
              ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            SHEET_FOCUS,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
