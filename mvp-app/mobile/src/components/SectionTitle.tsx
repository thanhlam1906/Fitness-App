import { Text, type TextProps } from "react-native"
import { cn } from "@/lib/cn"

/**
 * Tiêu đề mục ở màn người tập — `.section-title` của web: chữ thường. Nhãn in hoa trên mọi khối là
 * dấu hiệu giao diện máy làm (doc/design-gon-giao-dien-user-v1.md §4).
 */
export function SectionTitle({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn("text-[13px] font-semibold text-text-muted", className)} {...props} />
}
