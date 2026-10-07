import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthField, AuthLayout, OrDivider, PasswordInput, SocialButtons } from "@/features/auth/components/AuthLayout"
import { useAuth } from "@/features/auth/components/AuthContext"
import {
  isPasswordChangeRequired,
  newPasswordSchema,
  type NewPasswordValues,
} from "@/features/auth/types/passwordSchema"

// Chỉ kiểm bắt buộc: z.email() chặt hơn @Email của backend, tài khoản cũ có thể bị chặn oan.
const loginSchema = z.object({
  email: z.string().trim().min(1, "Nhập email"),
  password: z.string().min(1, "Nhập mật khẩu"),
})
type LoginValues = z.infer<typeof loginSchema>

/** Màn 01 concept-frontend-v1.md, dựng lại theo doc/design-ui-m1-v1.md. */
export function LoginPage() {
  const { login, completePasswordChange } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  function goIn() {
    const from = (location.state as { from?: string } | null)?.from ?? "/schedule"
    navigate(from, { replace: true })
  }

  async function onSubmit(values: LoginValues) {
    setError(null)
    try {
      await login(values.email, values.password)
      goIn()
    } catch (e) {
      if (isPasswordChangeRequired(e)) {
        setPending({ email: values.email, password: values.password })
        return
      }
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại")
    }
  }

  if (pending) {
    return (
      <NewPasswordStep
        onSubmit={async (newPassword) => {
          await completePasswordChange(pending.email, pending.password, newPassword)
          goIn()
        }}
        onBack={() => setPending(null)}
      />
    )
  }

  return (
    <AuthLayout title="Đăng nhập" subtitle="Tiếp tục lịch tập của bạn.">
      <SocialButtons />
      <OrDivider label="hoặc" />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <AuthField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ban@email.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </AuthField>
        <AuthField id="password" label="Mật khẩu" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Mật khẩu của bạn"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </AuthField>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[13px] text-[var(--color-text-muted)]">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-[var(--color-accent)]">
          Đăng ký
        </Link>
      </p>
    </AuthLayout>
  )
}

/** Đăng nhập bằng mật khẩu tạm admin cấp: chưa có token cho tới khi đặt mật khẩu của riêng mình. */
function NewPasswordStep({
  onSubmit,
  onBack,
}: {
  onSubmit: (newPassword: string) => Promise<void>
  onBack: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) })

  async function submit(values: NewPasswordValues) {
    setError(null)
    try {
      await onSubmit(values.newPassword)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không đổi được mật khẩu")
    }
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle="Tài khoản đang dùng mật khẩu tạm. Đặt mật khẩu của riêng bạn để tiếp tục.">
      <form noValidate onSubmit={handleSubmit(submit)} className="space-y-3.5">
        <AuthField id="newPassword" label="Mật khẩu mới" error={errors.newPassword?.message}>
          <PasswordInput id="newPassword" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
        </AuthField>
        <AuthField id="confirmPassword" label="Nhập lại mật khẩu mới" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </AuthField>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Lưu và vào app"}
        </Button>
      </form>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full text-center text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:underline"
      >
        ← Quay lại đăng nhập
      </button>
    </AuthLayout>
  )
}
