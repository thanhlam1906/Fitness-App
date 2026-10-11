import { useController, type Control } from "react-hook-form"
import { cn } from "@/lib/cn"
import { MUSCLE_OPTIONS } from "@/lib/muscles"
import { EQUIPMENT_OPTIONS } from "@/features/profile/types"
import type { ExerciseFormValues } from "@/features/admin/utils/filmingGuideForm"
import { setPrimaryMuscle, toggleEquipment, toggleSecondaryMuscle } from "@/features/admin/utils/exerciseCodes"

// Cùng kiểu nút với "Cần thiết bị" của TemplateEditor: admin gặp một kiểu chọn ở mọi màn.
const CHIP =
  "rounded-full border px-3 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const ON = "border-[var(--color-accent)] bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
const OFF = "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"

/**
 * Cơ chính, cơ phụ, thiết bị bằng nút bấm thay cho ô gõ mã cách nhau bằng phẩy (mockup
 * doc/mockup-chon-nhom-co). Hai hàng nhóm cơ ghép lại thành muscleGroups: cơ chính đứng đầu.
 */
export function MuscleEquipmentFields({ control }: { control: Control<ExerciseFormValues> }) {
  const muscles = useController({
    control,
    name: "muscleGroups",
    // Gợi ý bài thay thế tìm theo cơ chính; backend cũng chặn bài thiếu cơ chính.
    rules: { validate: (v) => (v?.length ?? 0) > 0 || "Chọn cơ chính." },
  })
  const equipment = useController({ control, name: "equipment" })
  const groups = muscles.field.value ?? []
  const primary = groups[0]
  const gear = equipment.field.value ?? []

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div id="muscle-primary" className="text-sm font-medium">
          Cơ chính
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Nhóm cơ làm việc nhiều nhất. Người tập thấy nó tô nổi; gợi ý bài thay thế tìm theo nhóm này.
        </p>
        <div role="radiogroup" aria-labelledby="muscle-primary" className="flex flex-wrap gap-1.5">
          {MUSCLE_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={primary === m.value}
              onClick={() => muscles.field.onChange(setPrimaryMuscle(groups, m.value))}
              className={cn(CHIP, primary === m.value ? ON : OFF)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {muscles.fieldState.error && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {muscles.fieldState.error.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div id="muscle-secondary" className="text-sm font-medium">
          Cơ phụ
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">Bấm để bật hoặc tắt, chọn bao nhiêu cũng được. Không bắt buộc.</p>
        <div role="group" aria-labelledby="muscle-secondary" className="flex flex-wrap gap-1.5">
          {MUSCLE_OPTIONS.map((m) => {
            const isPrimary = primary === m.value
            const on = !isPrimary && groups.includes(m.value)
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={on}
                // Chưa có cơ chính thì cơ phụ chưa có chỗ đứng (cơ chính phải ở đầu danh sách).
                disabled={isPrimary || !primary}
                title={isPrimary ? "Đang là cơ chính" : !primary ? "Chọn cơ chính trước" : undefined}
                onClick={() => muscles.field.onChange(toggleSecondaryMuscle(groups, m.value))}
                className={cn(CHIP, on ? ON : OFF, "disabled:cursor-not-allowed disabled:opacity-35")}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <div id="equipment" className="text-sm font-medium">
          Thiết bị
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Bấm để bật hoặc tắt. Không chọn gì = tập tay không. Gợi ý bài thay thế chỉ đưa ra bài mà người tập có đủ
          thiết bị.
        </p>
        <div role="group" aria-labelledby="equipment" className="flex flex-wrap gap-1.5">
          {EQUIPMENT_OPTIONS.map((o) => {
            const on = gear.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => equipment.field.onChange(toggleEquipment(gear, o.value))}
                className={cn(CHIP, on ? ON : OFF)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
