import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // accent = "việc cần làm tiếp" — §3.2, dùng tiết chế cho CTA chính
        primary: "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:brightness-95",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]",
        ghost: "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      },
      size: {
        // CTA đáy màn điện thoại — design để 50–52px, đủ to để bấm khi đang cầm tạ.
        md: "min-h-[50px] rounded-[var(--radius-md)] px-5 text-base",
        // Nút trên thanh công cụ admin.
        sm: "h-[38px] rounded-[var(--radius-sm)] px-4 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = "Button"
