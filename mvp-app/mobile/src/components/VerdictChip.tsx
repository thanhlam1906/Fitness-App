import { Text, View } from "react-native"
import type { Verdict } from "@/components/VerdictChip"
import { cn } from "@/lib/cn"

/**
 * Năm verdict, không phải ba (concept-backend-v1.md §4.5): LOW_CONFIDENCE ("quay rõ hơn") và
 * NOT_APPLICABLE ("quay thêm góc khác") dẫn tới hai hành động khác nhau. Ký hiệu ✓ / ✕ đi kèm màu.
 * Bản mobile của VerdictChip web.
 */
const STYLES: Record<Verdict, { label: string; box: string; text: string }> = {
  PASS: { label: "Đạt ✓", box: "bg-success-tint", text: "text-success" },
  WARN: { label: "Sát ngưỡng", box: "bg-warn-tint", text: "text-warn" },
  FAIL: { label: "Không đạt ✕", box: "bg-danger-tint", text: "text-danger" },
  LOW_CONFIDENCE: { label: "Chưa đủ tin cậy", box: "bg-warn-tint", text: "text-warn" },
  NOT_APPLICABLE: { label: "Sai góc quay", box: "bg-surface-2", text: "text-text-muted" },
}

export function VerdictChip({ verdict }: { verdict: string }) {
  const style = STYLES[verdict as Verdict] ?? { label: verdict, box: "bg-surface-2", text: "text-text-muted" }
  return (
    <View className={cn("rounded-full px-2.5 py-1", style.box)}>
      <Text className={cn("text-xs font-bold", style.text)}>{style.label}</Text>
    </View>
  )
}
