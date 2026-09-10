import { formatKg } from "@/lib/format"
import { cn } from "@/lib/cn"

export type LoadDecision = {
  id: string
  direction: string
  deltaKg: number | null
  messageVi: string
}

/**
 * §3.2 concept-frontend-v1.md — tải TĂNG dùng accent, tải GIẢM dùng danger,
 * GIỮ dùng text-muted. Không màu nào có hai nghĩa.
 *
 * Design để nó là chữ đậm có màu đứng ngay trước câu lý do, không phải viên
 * thuốc: lý do mới là thứ người dùng đọc, con số chỉ để liếc.
 *
 * "Không dùng màu làm tín hiệu duy nhất": luôn kèm chữ (`+2,5 kg`, `giữ tải`),
 * nên người mù màu vẫn đọc được.
 */
export function LoadDeltaBadge({ decision }: { decision: LoadDecision }) {
  const { label, tone } = describe(decision)
  return (
    <span className={cn("num text-xs font-bold whitespace-nowrap", tone)} title={decision.messageVi}>
      {label}
    </span>
  )
}

function describe(decision: LoadDecision): { label: string; tone: string } {
  const kg = decision.deltaKg == null ? null : Math.abs(decision.deltaKg)
  switch (decision.direction) {
    case "UP":
      return {
        label: `+${kg == null ? "" : formatKg(kg)}`.trim(),
        tone: "text-[var(--color-accent)]",
      }
    case "DOWN":
      return {
        label: `−${kg == null ? "" : formatKg(kg)}`.trim(),
        tone: "text-[var(--color-danger)]",
      }
    case "SUBSTITUTE":
      return { label: "đổi bài", tone: "text-[var(--color-warn)]" }
    default:
      return { label: "giữ tải", tone: "text-[var(--color-text-muted)]" }
  }
}
