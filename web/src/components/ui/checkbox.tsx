import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "size-4 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface-2)]",
      "accent-[var(--color-accent)]",
      className,
    )}
    {...props}
  />
))
Checkbox.displayName = "Checkbox"
