import { useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"

/**
 * Hộp xác nhận cho thao tác quản trị (doc/design-quan-ly-user-v1.md §6.6), dựng trên <dialog>
 * gốc của trình duyệt: có sẵn focus trap, Esc để đóng, nền mờ — không thêm thư viện. Cha chỉ
 * render khi mở; đóng là cha bỏ render, nên state ô nhập luôn sạch mỗi lần mở.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  danger,
  reasonLabel,
  confirmText,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  /** Có thì bắt nhập lý do (khoá, xoá). */
  reasonLabel?: string
  /** Có thì bắt gõ lại đúng chuỗi này (email khi xoá). */
  confirmText?: string
  pending: boolean
  error: string | null
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState("")
  const [typed, setTyped] = useState("")

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const ready =
    !pending && (!reasonLabel || reason.trim() !== "") && (!confirmText || typed.trim() === confirmText)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault()
      }}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] backdrop:bg-[var(--color-bg)]/70"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</div>
      {reasonLabel && (
        <label className="mt-4 block text-sm">
          {reasonLabel}
          <Textarea className="mt-1.5" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {confirmText && (
        <label className="mt-4 block text-sm">
          Gõ <span className="font-semibold">{confirmText}</span> để xác nhận
          <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => ref.current?.close()} disabled={pending}>
          Huỷ
        </Button>
        <Button
          className={cn(danger && "bg-[var(--color-danger)] text-[var(--color-accent-fg)]")}
          disabled={!ready}
          onClick={() => onConfirm(reason.trim())}
        >
          {pending ? "Đang xử lý…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
