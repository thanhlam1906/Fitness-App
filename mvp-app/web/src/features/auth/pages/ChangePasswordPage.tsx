import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { AuthField, PasswordInput } from "@/features/auth/components/AuthLayout"
import { useAuth } from "@/features/auth/components/AuthContext"
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/types/passwordSchema"
import { SettingsSubLayout } from "@/features/profile/components/SettingsSubLayout"

/**
 * Cài đặt › Đổi mật khẩu — dùng cho cả người tập (/settings/password, khung user) và admin
 * (/admin/password, khung admin; `inAdmin` đổi phần đầu trang). Đổi xong các thiết bị khác bị đăng xuất.
 */
export function ChangePasswordPage({ inAdmin = false }: { inAdmin?: boolean }) {
  const { changePassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })

  async function submit(values: ChangePasswordValues) {
    setError(null)
    setDone(false)
    try {
      await changePassword(values.currentPassword, values.newPassword)
      reset()
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không đổi được mật khẩu")
    }
  }

  const form = (
    <>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Đổi xong, các thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất.
      </p>
      <form noValidate onSubmit={handleSubmit(submit)} className="mt-5 max-w-md space-y-3.5">
        <AuthField id="currentPassword" label="Mật khẩu hiện tại" error={errors.currentPassword?.message}>
          <PasswordInput id="currentPassword" autoComplete="current-password" {...register("currentPassword")} />
        </AuthField>
        <AuthField id="newPassword" label="Mật khẩu mới" error={errors.newPassword?.message}>
          <PasswordInput id="newPassword" autoComplete="new-password" {...register("newPassword")} />
        </AuthField>
        <AuthField id="confirmPassword" label="Nhập lại mật khẩu mới" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
        </AuthField>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm text-[var(--color-success)]">
            Đã đổi mật khẩu.
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu…" : "Đổi mật khẩu"}
        </Button>
      </form>
    </>
  )

  if (inAdmin) {
    return (
      <>
        <AdminHeader group="Tài khoản" title="Đổi mật khẩu" />
        <div className="overflow-auto px-7 py-5.5">{form}</div>
      </>
    )
  }
  return <SettingsSubLayout title="Đổi mật khẩu">{form}</SettingsSubLayout>
}
