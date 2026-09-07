import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)]",
        "px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
        "outline-none focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
