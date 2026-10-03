import { cn } from "@/lib/cn"

export type Verdict = "PASS" | "WARN" | "FAIL" | "LOW_CONFIDENCE" | "NOT_APPLICABLE"

/**
 * Năm verdict, không phải ba (concept-backend-v1.md §4.5). LOW_CONFIDENCE
 * ("quay rõ hơn") và NOT_APPLICABLE ("quay thêm góc khác") dẫn tới hai hành
 * động khác nhau, nên hiển thị khác nhau.
 *
 * Ký hiệu ✓ / ✕ đi kèm màu: không dùng màu làm tín hiệu duy nhất.
 */
const STYLES: Record<Verdict, { label: string; tone: string }> = {
  PASS: { label: "Đạt ✓", tone: "text-[var(--color-success)] bg-[var(--color-success-tint)]" },
  WARN: { label: "Sát ngưỡng", tone: "text-[var(--color-warn)] bg-[var(--color-warn-tint)]" },
  FAIL: { label: "Không đạt ✕", tone: "text-[var(--color-danger)] bg-[var(--color-danger-tint)]" },
  LOW_CONFIDENCE: {
    label: "Chưa đủ tin cậy",
    tone: "text-[var(--color-warn)] bg-[var(--color-warn-tint)]",
  },
  NOT_APPLICABLE: {
    label: "Sai góc quay",
    tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]",
  },
}

export function VerdictChip({ verdict }: { verdict: string }) {
  const style = STYLES[verdict as Verdict] ?? {
    label: verdict,
    tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        style.tone,
      )}
    >
      {style.label}
    </span>
  )
}
