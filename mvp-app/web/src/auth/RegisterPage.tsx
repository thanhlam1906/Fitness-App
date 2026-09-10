import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "./LoginPage"
import { useAuth } from "./AuthContext"

type FormValues = { email: string; password: string }

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setError(null)
    setSubmitting(true)
    try {
      await registerUser(values.email, values.password)
      navigate("/onboarding", { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng ký thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      headline={
        <>
          Sáu bước,
          <br />
          rồi vào tuần một.
        </>
      }
      intro="Tạo tài khoản rồi trả lời sáu câu về cơ thể, mục tiêu và thiết bị. Lưu sau mỗi bước, bỏ dở quay lại tiếp được."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu (tối thiểu 8 ký tự)</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            {...register("password", { required: true, minLength: 8 })}
          />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting ? "Đang tạo tài khoản…" : "Đăng ký"}
        </Button>
      </form>
      <p className="mt-3.5 text-[13px] text-[var(--color-text-muted)]">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-[var(--color-accent)]">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
