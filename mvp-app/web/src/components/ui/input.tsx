import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "px-3.5 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
        "outline-none focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
