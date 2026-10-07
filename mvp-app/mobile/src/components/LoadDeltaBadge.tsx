import { Text } from "react-native"
import type { LoadDecision } from "@/components/LoadDeltaBadge"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"

/**
 * §3.2 concept-frontend-v1.md — tải TĂNG dùng accent, GIẢM dùng danger, GIỮ dùng text-muted.
 * Luôn kèm chữ (`+2,5 kg`, `giữ tải`) để không dùng màu làm tín hiệu duy nhất. Như bản web.
 */
export function LoadDeltaBadge({ decision }: { decision: LoadDecision }) {
  const { label, tone } = describe(decision)
  return (
    <Text className={cn("text-xs font-bold", tone)} style={{ fontVariant: ["tabular-nums"] }}>
      {label}
    </Text>
  )
}

function describe(decision: LoadDecision): { label: string; tone: string } {
  const kg = decision.deltaKg == null ? null : Math.abs(decision.deltaKg)
  switch (decision.direction) {
    case "UP":
      return { label: `+${kg == null ? "" : formatKg(kg)}`.trim(), tone: "text-accent" }
    case "DOWN":
      return { label: `−${kg == null ? "" : formatKg(kg)}`.trim(), tone: "text-danger" }
    case "SUBSTITUTE":
      return { label: "đổi bài", tone: "text-warn" }
    default:
      return { label: "giữ tải", tone: "text-text-muted" }
  }
}
