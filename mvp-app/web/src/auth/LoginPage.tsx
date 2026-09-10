import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "./AuthContext"

type FormValues = { email: string; password: string }

/**
 * Màn 01 concept-frontend-v1.md. Design có ô "Mã mời" nhưng backend chưa có
 * khái niệm đó (đăng ký đang tự do), nên bỏ ô — hiện một ô không làm gì thì tệ
 * hơn là không hiện.
 */
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setError(null)
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from ?? "/schedule"
      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      headline={
        <>
          Tuần đầu tiên
          <br />
          bắt đầu hôm nay.
        </>
      }
      intro="Chọn một chương trình có sẵn, tập theo lịch, ghi từng set. Phần tính tải để app lo."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" {...register("password", { required: true })} />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
      <p className="mt-3.5 text-[13px] text-[var(--color-text-muted)]">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="text-[var(--color-accent)]">
          Đăng ký
        </Link>
      </p>
    </AuthLayout>
  )
}

/** Khung chung của màn 01: chữ lớn ở nửa trên, form ở nửa dưới, một cột hẹp. */
export function AuthLayout({
  headline,
  intro,
  children,
}: {
  headline: React.ReactNode
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pt-16 pb-11">
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-[11px] font-bold tracking-[0.12em] text-[var(--color-accent)] uppercase">
          Sổ Tập
        </div>
        <h1 className="mt-3.5 text-[34px] leading-[1.05] font-extrabold tracking-[-0.025em]">
          {headline}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{intro}</p>
      </div>
      {children}
      <div className="flex-1" />
    </div>
  )
}
