import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/Logo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/cn"

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"

/**
 * Khung chung màn đăng nhập, đăng ký (hướng B, doc/design-ui-m1-v1.md §2). Ảnh chỉ phủ
 * phần đầu rồi chìm vào màu nền: form đăng ký dài cuộn trên nền phẳng, chữ luôn đọc được.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg)]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[620px] bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 25%, transparent), color-mix(in srgb, var(--color-bg) 70%, transparent) 55%, var(--color-bg)), url(/auth/bg.jpg)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[430px] px-4 pt-6 pb-10">
        <Logo className="px-1" />
        <h1 className="mt-30 px-1 text-[30px] leading-[1.1] font-extrabold tracking-[-0.025em]">
          {title}
        </h1>
        <p className="mt-1.5 px-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--color-glass-border)] bg-[var(--color-glass)] p-4 backdrop-blur-[16px]">
          {children}
        </div>
      </div>
    </div>
  )
}

const PROVIDERS = [
  { name: "Google", Icon: GoogleIcon },
  { name: "Facebook", Icon: FacebookIcon },
]

/** Chưa nối OAuth (nối sau khi deploy). Bấm vẫn phản hồi để người dùng không tưởng app hỏng. */
export function SocialButtons() {
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {PROVIDERS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setNotice(`Đăng nhập bằng ${name} sẽ mở sau khi app phát hành.`)}
            className={cn(
              "relative flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold hover:bg-[var(--color-surface-2)]",
              FOCUS,
            )}
          >
            <Icon />
            {name}
            <span className="absolute -top-2 right-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 text-[10px] font-bold text-[var(--color-text-muted)]">
              Sắp có
            </span>
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">
          {notice}
        </p>
      )}
    </div>
  )
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-text-muted)] before:h-px before:flex-1 before:bg-[var(--color-border)] after:h-px after:flex-1 after:bg-[var(--color-border)]">
      {label}
    </div>
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [shown, setShown] = useState(false)
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className={cn(
            "absolute inset-y-0 right-0 grid w-11 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            FOCUS,
          )}
        >
          {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = "PasswordInput"

/** Nhãn + ô + lỗi ngay dưới ô: người dùng thấy sai ở đâu mà không phải đọc cả form. */
export function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </Label>
      {children}
      {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

// Màu thương hiệu Google, Facebook: ngoại lệ duy nhất của luật không hardcode hex.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  )
}
