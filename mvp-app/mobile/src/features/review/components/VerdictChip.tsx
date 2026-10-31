import { Text, View } from "react-native"
import { Check, X, type LucideIcon } from "lucide-react-native"
import type { Verdict } from "@/features/review/components/VerdictChip"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/**
 * Năm verdict, không phải ba (concept-backend-v1.md §4.5): LOW_CONFIDENCE ("quay rõ hơn") và
 * NOT_APPLICABLE ("quay thêm góc khác") dẫn tới hai hành động khác nhau. Biểu tượng tick / chéo đi kèm màu.
 * Bản mobile của VerdictChip web.
 */
const STYLES: Record<Verdict, { label: string; box: string; text: string; icon?: LucideIcon; iconColor?: string }> = {
  PASS: { label: "Đạt", icon: Check, iconColor: colors.success, box: "bg-success-tint", text: "text-success" },
  WARN: { label: "Sát quy chuẩn", box: "bg-warn-tint", text: "text-warn" },
  FAIL: { label: "Không đạt", icon: X, iconColor: colors.danger, box: "bg-danger-tint", text: "text-danger" },
  LOW_CONFIDENCE: { label: "Chưa đủ tin cậy", box: "bg-warn-tint", text: "text-warn" },
  NOT_APPLICABLE: { label: "Sai góc quay", box: "bg-surface-2", text: "text-text-muted" },
}

export function VerdictChip({ verdict }: { verdict: string }) {
  const style: (typeof STYLES)[Verdict] = STYLES[verdict as Verdict] ?? {
    label: verdict,
    box: "bg-surface-2",
    text: "text-text-muted",
  }
  return (
    <View className={cn("flex-row items-center gap-1 rounded-full px-2.5 py-1", style.box)}>
      {style.icon && <style.icon size={14} strokeWidth={3} color={style.iconColor} />}
      <Text className={cn("text-xs font-bold", style.text)}>{style.label}</Text>
    </View>
  )
}
