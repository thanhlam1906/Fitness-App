import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "num w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)]",
        "px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
        "outline-none focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"
