import { useFormContext, useWatch } from "react-hook-form"
import { cn } from "@/lib/cn"
import type { ProgramTemplateInput, Progression } from "@/features/admin/types"
import { HelpButton, HelpText, useHelp } from "@/features/admin/components/HelpButton"
import { TEMPLATE_HELP, type TemplateHelpKey } from "@/features/admin/utils/templateHelp"

const RULE_KEYS = ["deloadPct", "minCompletionPct", "targetRpe", "rpeLowStreak", "rpeOver", "missedSetsToDeload", "failStreakToDeload"] as const

/** 4 thẻ theo thứ tự engine xét; số nằm ngay trong câu như mockup. hit = thẻ vừa quyết định ở "Thử quy tắc". */
export function ProgressionRulesEditor({ hit }: { hit: 1 | 2 | 3 | 4 | null }) {
  const { register, control, formState } = useFormContext<ProgramTemplateInput>()
  const deloadPct = useWatch({ control, name: "progression.deloadPct" })
  const help = useHelp<TemplateHelpKey>()
  const errors = formState.errors.progression

  const n = (key: Exclude<keyof Progression, "incrementKg">, unit: string, label: string) => (
    <label
      className={cn(
        "mx-1 inline-flex h-[34px] items-center rounded-lg border bg-[var(--color-bg)] px-2 align-middle focus-within:border-[var(--color-accent)]",
        errors?.[key] ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
      )}
    >
      <input
        {...register(`progression.${key}`, { valueAsNumber: true })}
        inputMode="decimal"
        aria-label={label}
        className="num w-10 bg-transparent text-right font-bold outline-none"
      />
      {unit && <span className="ml-1 text-[13px] text-[var(--color-text-muted)]">{unit}</span>}
    </label>
  )

  const card = (k: 1 | 2 | 3 | 4, title: string, body: React.ReactNode) => {
    const key = `r${k}` as TemplateHelpKey
    return (
      <div className={cn("mt-2.5 flex gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 py-3", hit === k ? "border-[var(--color-accent)]" : "border-[var(--color-border)]")}>
        <div className={cn("grid size-[26px] flex-none place-items-center rounded-full text-[13px] font-extrabold", hit === k ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "bg-[var(--color-surface-2)]")}>
          {k}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center text-sm font-bold">
            {title}
            <HelpButton open={help.isOpen(key)} onClick={() => help.toggle(key)} />
          </div>
          {help.isOpen(key) && <HelpText lines={TEMPLATE_HELP[key]} className="mt-2" />}
          <p className="mt-1.5 text-sm leading-[2.2]">{body}</p>
        </div>
      </div>
    )
  }

  const firstError = RULE_KEYS.map((k) => errors?.[k]?.message).find(Boolean)
  const arrow = <span className="text-[var(--color-text-muted)]"> → </span>

  return (
    <div>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Xét sau mỗi buổi, từ 1 xuống 4, dừng ở quy tắc khớp đầu tiên.</p>
      {card(1, "Báo đau", <>Buổi có báo đau{arrow}giảm{n("deloadPct", "%", "Phần trăm giảm")}tạ. Buổi sau vẫn báo đau{arrow}đề xuất bài thay thế.</>)}
      {card(2, "Tỉ lệ hoàn thành", <>Hoàn thành dưới{n("minCompletionPct", "%", "Tỉ lệ hoàn thành tối thiểu")}số set{arrow}giữ tạ.</>)}
      {card(3, "RPE", <>RPE mục tiêu{n("targetRpe", "", "RPE mục tiêu")}. Thấp hơn mục tiêu{n("rpeLowStreak", "buổi liền", "Số buổi RPE thấp")}{arrow}tăng một bước. Cao hơn mục tiêu quá{n("rpeOver", "", "Độ vượt RPE")}{arrow}giữ tạ.</>)}
      {card(4, "Đủ rep", <>Mọi set chạm rep đến{arrow}tăng một bước. Từ{n("missedSetsToDeload", "set", "Số set chưa chạm")}chưa chạm và hụt rep{n("failStreakToDeload", "buổi liền", "Số buổi hụt liền")}{arrow}giảm {Number.isFinite(deloadPct) ? deloadPct : "…"}% (số ở quy tắc 1). Còn lại{arrow}giữ tạ.</>)}
      {firstError && <p className="mt-2 text-xs text-[var(--color-danger)]">{firstError}</p>}
    </div>
  )
}
