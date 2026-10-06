import { Controller, useFormContext, useWatch } from "react-hook-form"
import { cn } from "@/lib/cn"
import type { ProgramTemplateInput } from "@/features/admin/types"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"

/**
 * Bước tăng tạ theo BÀI trong cả template (không theo dòng): bài ở buổi A và B dùng chung một bước,
 * sửa một chỗ không lặng lẽ đổi chỗ khác. Ba trạng thái: số kg / null "Không tự tăng" / thiếu khoá "Chưa chọn".
 */
export function IncrementEditor({ slugs, nameOf }: { slugs: string[]; nameOf: (slug: string) => string }) {
  const { control } = useFormContext<ProgramTemplateInput>()
  const incrementKg = useWatch({ control, name: "progression.incrementKg" })

  if (slugs.length === 0) {
    return <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Template không có bài nào cần tạ.</p>
  }

  return (
    <Controller
      control={control}
      name="progression.incrementKg"
      render={({ field, fieldState }) => {
        const set = (slug: string, v: number | null) => field.onChange({ ...field.value, [slug]: v })
        return (
          <div className="space-y-2">
            {slugs.map((slug) => {
              const v = incrementKg?.[slug]
              const chosen = slug in (incrementKg ?? {})
              const isInc = typeof v === "number"
              return (
                <div key={slug} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
                  <b className="min-w-0 flex-1 truncate text-sm">{nameOf(slug)}</b>
                  {!chosen && <span className="text-xs text-[var(--color-warn)]">Chưa chọn</span>}
                  <label
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-[13px]",
                      isInc ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]" : "border-[var(--color-border)]",
                    )}
                  >
                    <input
                      type="radio"
                      name={`inc-${slug}`}
                      checked={isInc}
                      onChange={() => set(slug, 2.5)}
                      className={cn("accent-[var(--color-accent)]", FOCUS)}
                    />
                    Tăng mỗi lần
                    <input
                      inputMode="decimal"
                      aria-label={`Bước tăng ${nameOf(slug)} (kg)`}
                      disabled={!isInc}
                      value={isInc ? String(v) : ""}
                      onChange={(e) => set(slug, e.target.value === "" ? Number.NaN : Number(e.target.value))}
                      className="num h-7 w-14 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-right font-bold outline-none focus:border-[var(--color-accent)] disabled:opacity-45"
                    />
                    <span className="text-[var(--color-text-muted)]">kg</span>
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]",
                      v === null ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]" : "border-[var(--color-border)]",
                    )}
                  >
                    <input
                      type="radio"
                      name={`inc-${slug}`}
                      checked={v === null}
                      onChange={() => set(slug, null)}
                      className={cn("accent-[var(--color-accent)]", FOCUS)}
                    />
                    Không tự tăng
                  </label>
                </div>
              )
            })}
            {fieldState.error && <p className="text-xs text-[var(--color-danger)]">Có bước tăng chưa hợp lệ: phải lớn hơn 0 và không quá 20 kg.</p>}
          </div>
        )
      }}
    />
  )
}
