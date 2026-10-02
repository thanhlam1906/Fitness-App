import { Text, View } from "react-native"
import { cn } from "@/lib/cn"

/**
 * Trạng thái chấm form ở danh sách — bản mobile của StatusBadge web (phần chấm clip; trạng thái buổi
 * tập mobile tô thẳng trong lưới Lịch). Màu luôn kèm chữ.
 */
const STYLES: Record<string, { label: string; box: string; text: string }> = {
  PENDING: { label: "Đang chờ", box: "bg-warn-tint", text: "text-warn" },
  PROCESSING: { label: "Đang phân tích", box: "bg-warn-tint", text: "text-warn" },
  DONE: { label: "Đã xong ✓", box: "bg-success-tint", text: "text-success" },
  FAILED: { label: "Chấm lỗi", box: "bg-danger-tint", text: "text-danger" },
  REJECTED: { label: "Clip chưa dùng được", box: "bg-danger-tint", text: "text-danger" },
  // REJECTED vì AI chưa nhận ra bài: số đo vẫn dùng được, chỉ cần người dùng chọn bài.
  NEEDS_EXERCISE: { label: "Cần chọn bài", box: "bg-warn-tint", text: "text-warn" },
}

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, box: "bg-surface-2", text: "text-text-muted" }
  return (
    <View className={cn("rounded-full px-2.5 py-1", style.box)}>
      <Text className={cn("text-xs font-semibold", style.text)}>{style.label}</Text>
    </View>
  )
}
