import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { AuthField, AuthLayout, OrDivider, PasswordInput, SocialButtons } from "./AuthLayout"
import { useAuth } from "./AuthContext"
import { registerSchema, toRegisterPayload, type RegisterValues } from "./registerSchema"

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  })

  async function onSubmit(values: RegisterValues) {
    setError(null)
    try {
      await registerUser(toRegisterPayload(values))
      navigate("/onboarding", { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng ký thất bại")
    }
  }

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Mất khoảng một phút.">
      <SocialButtons />
      <OrDivider label="hoặc đăng ký bằng email" />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <AuthField id="fullName" label="Họ và tên" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
        </AuthField>
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
        <AuthField id="phone" label="Số điện thoại" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0912 345 678"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
        </AuthField>
        <AuthField id="password" label="Mật khẩu" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </AuthField>
        <AuthField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Gõ lại mật khẩu"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </AuthField>
        <div>
          <label className="flex items-start gap-2.5 pt-1 text-[13px] leading-snug text-[var(--color-text-muted)]">
            <Checkbox
              className="mt-0.5 flex-none"
              aria-invalid={!!errors.acceptTerms}
              {...register("acceptTerms")}
            />
            {/* Chưa có trang điều khoản (F1 concept-frontend) nên chỉ in đậm, chưa là link. */}
            <span>
              Tôi đồng ý với <b className="text-[var(--color-text)]">Điều khoản sử dụng</b> và{" "}
              <b className="text-[var(--color-text)]">Chính sách bảo mật</b> của VFit
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="mt-1.5 text-[13px] text-[var(--color-danger)]">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[13px] text-[var(--color-text-muted)]">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-[var(--color-accent)]">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
