import { useEffect, useRef, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCreateUser } from "@/features/admin/api/useAdminUsers"
import { TemporaryPasswordDialog } from "@/features/admin/components/TemporaryPasswordDialog"
import { createUserSchema, toCreateUserPayload, type CreateUserValues } from "@/features/admin/types/createUserSchema"
import { ROLE_LABEL } from "@/features/admin/utils/userLabels"

/** "Thêm người dùng" — tạo xong hiện mật khẩu tạm một lần (spec §6.4). */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const create = useCreateUser()
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: "", email: "", phone: "", role: "USER" },
  })

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function submit(values: CreateUserValues) {
    setError(null)
    try {
      const result = await create.mutateAsync(toCreateUserPayload(values))
      setCreated({ email: result.user.email, password: result.temporaryPassword })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tạo được tài khoản")
    }
  }

  if (created) return <TemporaryPasswordDialog email={created.email} password={created.password} onClose={onClose} />

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (isSubmitting) e.preventDefault()
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] backdrop:bg-[var(--color-bg)]/70"
    >
      <h2 className="text-lg font-bold">Thêm người dùng</h2>
      <form noValidate onSubmit={handleSubmit(submit)} className="mt-4 space-y-3">
        <Field label="Họ và tên" error={errors.fullName?.message}>
          <Input {...register("fullName")} aria-invalid={!!errors.fullName} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Số điện thoại (không bắt buộc)" error={errors.phone?.message}>
          <Input inputMode="tel" {...register("phone")} aria-invalid={!!errors.phone} />
        </Field>
        <Field label="Vai trò">
          <select
            className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
            {...register("role")}
          >
            <option value="USER">{ROLE_LABEL.USER}</option>
            <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
          </select>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => ref.current?.close()}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo…" : "Tạo tài khoản"}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </label>
  )
}
