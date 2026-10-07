import { Text, type TextProps } from "react-native"
import { cn } from "@/lib/cn"

export function Label({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn("text-xs font-medium text-text-muted", className)} {...props} />
}
