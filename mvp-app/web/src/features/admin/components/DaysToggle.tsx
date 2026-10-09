import { INSIGHT_DAYS, type InsightDays } from "@/features/admin/utils/workoutInsights"
import { cn } from "@/lib/cn"

/** Nhóm nút 7 / 30 / 90 ngày ở đầu các trang số liệu của admin. */
export function DaysToggle({ value, onChange }: { value: InsightDays; onChange: (days: InsightDays) => void }) {
  return (
    <div role="group" aria-label="Khoảng thời gian" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
      {INSIGHT_DAYS.map((d, i) => (
        <button
          key={d}
          type="button"
          aria-pressed={value === d}
          onClick={() => onChange(d)}
          className={cn(
            "num px-4 py-2 text-[13px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
            i > 0 && "border-l border-[var(--color-border)]",
            value === d
              ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          {d} ngày
        </button>
      ))}
    </div>
  )
}
