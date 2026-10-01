import type { ReactNode } from "react"
import { Pressable, Text, type PressableProps } from "react-native"
import { cn } from "@/lib/cn"

// Cùng biến thể với web/src/components/ui/button.tsx. RN không cho chữ thừa kế màu từ khung bấm,
// nên mỗi biến thể có hai phần: khung (box) và chữ (text).
const VARIANT = {
  // accent = "việc cần làm tiếp" — §3.2, dùng tiết chế cho CTA chính
  primary: { box: "bg-accent", text: "font-bold text-accent-fg" },
  secondary: { box: "border border-border bg-surface", text: "font-bold text-text" },
  ghost: { box: "", text: "font-medium text-text-muted" },
}

const SIZE = {
  // CTA đáy màn điện thoại — design để 50–52px, đủ to để bấm khi đang cầm tạ.
  md: { box: "min-h-[50px] rounded-md px-5", text: "text-base" },
  sm: { box: "h-[38px] rounded-sm px-4", text: "text-sm" },
}

export type ButtonProps = Omit<PressableProps, "children"> & {
  variant?: keyof typeof VARIANT
  size?: keyof typeof SIZE
  className?: string
  textClassName?: string
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  textClassName,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const v = VARIANT[variant]
  const s = SIZE[size]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center gap-2 active:opacity-80",
        v.box,
        s.box,
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className={cn(v.text, s.text, textClassName)}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
