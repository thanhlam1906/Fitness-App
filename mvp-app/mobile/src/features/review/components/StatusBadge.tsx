import { Text, View } from "react-native"
import { Check, type LucideIcon } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/**
 * Trạng thái chấm form ở danh sách — bản mobile của StatusBadge web (phần chấm clip; trạng thái buổi
 * tập mobile tô thẳng trong lưới Lịch). Màu luôn kèm chữ.
 */
const STYLES: Record<string, { label: string; box: string; text: string; icon?: LucideIcon; iconColor?: string }> = {
  PENDING: { label: "Đang chờ", box: "bg-warn-tint", text: "text-warn" },
  PROCESSING: { label: "Đang phân tích", box: "bg-warn-tint", text: "text-warn" },
  DONE: { label: "Đã xong", icon: Check, iconColor: colors.success, box: "bg-success-tint", text: "text-success" },
  FAILED: { label: "Chấm lỗi", box: "bg-danger-tint", text: "text-danger" },
  // Lần chấm bằng camera không có clip nào: chữ không nhắc tới clip.
  REJECTED: { label: "Chưa dùng được", box: "bg-danger-tint", text: "text-danger" },
  // REJECTED vì AI chưa nhận ra bài: số đo vẫn dùng được, chỉ cần người dùng chọn bài.
  NEEDS_EXERCISE: { label: "Cần chọn bài", box: "bg-warn-tint", text: "text-warn" },
}

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, box: "bg-surface-2", text: "text-text-muted" }
  return (
    <View className={cn("flex-row items-center gap-1 rounded-full px-2.5 py-1", style.box)}>
      {style.icon && <style.icon size={14} strokeWidth={3} color={style.iconColor} />}
      <Text className={cn("text-xs font-semibold", style.text)}>{style.label}</Text>
    </View>
  )
}
