import { forwardRef, useState } from "react"
import { TextInput, type TextInputProps } from "react-native"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

export type InputProps = TextInputProps & { className?: string; invalid?: boolean }

// Web tô viền accent bằng :focus và viền đỏ bằng aria-invalid; RN không có hai thứ đó nên giữ state.
export const Input = forwardRef<TextInput, InputProps>(
  ({ className, invalid, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors["text-muted"]}
        className={cn(
          "h-12 w-full rounded-md border border-border bg-surface px-3.5 text-[15px] text-text",
          focused && "border-accent",
          invalid && "border-danger",
          className,
        )}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"
