import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        // 16px: iOS Safari tự phóng to cả trang khi chạm ô nhập chữ nhỏ hơn 16px và không thu lại.
        "px-3.5 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]",
        "outline-none focus:border-[var(--color-accent)] aria-invalid:border-[var(--color-danger)]",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
