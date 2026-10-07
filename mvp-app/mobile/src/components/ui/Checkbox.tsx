import type { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { Check } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/** Ô tích kèm nhãn: bấm cả dòng là đổi, như `<label>` bọc checkbox bên web. */
export function Checkbox({
  checked,
  onChange,
  invalid,
  className,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  invalid?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      className={cn("flex-row items-start gap-2.5", className)}
    >
      <View
        className={cn(
          "mt-0.5 size-5 items-center justify-center rounded-[4px] border border-border bg-surface-2",
          checked && "border-accent bg-accent",
          invalid && "border-danger",
        )}
      >
        {checked && <Check size={14} color={colors["accent-fg"]} strokeWidth={3} />}
      </View>
      {children}
    </Pressable>
  )
}
