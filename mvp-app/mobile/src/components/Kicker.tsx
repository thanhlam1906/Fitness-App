import { Text, type TextProps } from "react-native"
import { cn } from "@/lib/cn"

/** Nhãn nhỏ in hoa giãn chữ — `.kicker` của web, lặp ở nhiều màn. */
export function Kicker({ className, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={cn("text-[11px] uppercase tracking-[1.1px] text-text-muted", className)} {...props} />
  )
}
