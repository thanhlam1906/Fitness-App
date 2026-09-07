import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "./AuthContext"

type FormValues = { email: string; password: string }

/** concept-frontend-v1.md màn 1. Không có mã mời — đăng ký tự do (dự án chưa tới giai đoạn phát hành 100 tester). */
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
    <div className="mx-auto mt-24 max-w-sm">
      <Card className="space-y-4">
        <h1 className="text-lg font-semibold">Đăng nhập</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" {...register("password", { required: true })} />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </form>
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          Chưa có tài khoản? <Link to="/register" className="text-[var(--color-accent)]">Đăng ký</Link>
        </p>
      </Card>
    </div>
  )
}
