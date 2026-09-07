import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 px-4 py-2",
  {
    variants: {
      variant: {
        // accent = "việc cần làm tiếp" — §3.2, dùng tiết chế cho CTA chính
        primary: "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:brightness-95",
        secondary:
          "bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]",
        ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      },
    },
    defaultVariants: { variant: "primary" },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
)
Button.displayName = "Button"
