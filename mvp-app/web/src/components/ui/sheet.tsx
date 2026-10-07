import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/cn"

export const SHEET_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"

/**
 * Khung trượt từ đáy lên, dùng <dialog> gốc: Esc và giữ focus trong khung có sẵn,
 * không cần thư viện. Đóng khi bấm nền tối, Esc, hoặc cha đặt `open` = false.
 *
 * Nội dung chỉ render SAU khi dialog đã mở: dialog đóng là display:none, con nào
 * đo kích thước hay gán scrollTop lúc đó (cột cuộn của PickerField) sẽ bị trình
 * duyệt bỏ qua.
 */
export function Sheet({
  open,
  onClose,
  label,
  className,
  dismissible = true,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  /** false khi đang lưu: Esc và bấm nền không đóng, để không bỏ dở một lần lưu nhiều bước. */
  dismissible?: boolean
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      setShown(true)
    } else if (!open && d.open) {
      d.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={() => {
        setShown(false)
        onClose()
      }}
      // Trúng chính <dialog> nghĩa là nền tối: khung bên trong phủ hết phần còn lại. Phải nhấn
      // VÀ thả ở nền, không thì kéo cột bằng chuột rồi thả ra ngoài cũng đóng mất.
      onPointerDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onCancel={(e) => !dismissible && e.preventDefault()}
      onClick={(e) =>
        dismissible && pressedOnBackdrop.current && e.target === e.currentTarget && dialog.current?.close()
      }
      className="inset-x-0 top-auto bottom-0 mx-auto mb-0 w-full max-w-[430px] border-0 bg-transparent p-0 text-[var(--color-text)] transition-transform duration-200 backdrop:bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] starting:translate-y-full"
    >
      <div
        className={cn(
          "flex max-h-[88dvh] flex-col rounded-t-[20px] border-t border-[var(--color-border)] bg-[var(--color-surface)] pt-2.5",
          className,
        )}
      >
        <div aria-hidden className="mx-auto mb-1.5 h-1 w-10 flex-none rounded-full bg-[var(--color-border)]" />
        {shown && children}
      </div>
    </dialog>
  )
}

/** Hàng đầu khung kiểu iOS: "Huỷ" · tiêu đề · nút xác nhận (người dùng chốt giữ kiểu này, 09-26). */
export function SheetHeader({
  title,
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  title: string
  confirmLabel?: string
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm?: () => void
}) {
  return (
    <div className="flex flex-none items-center justify-between px-3 pb-2">
      <button
        type="button"
        onClick={onCancel}
        className={cn("rounded-[var(--radius-sm)] p-2 font-semibold text-[var(--color-text-muted)]", SHEET_FOCUS)}
      >
        {onConfirm ? "Huỷ" : "Đóng"}
      </button>
      <span className="font-bold">{title}</span>
      {onConfirm ? (
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={cn(
            "rounded-[var(--radius-sm)] p-2 font-extrabold text-[var(--color-accent)] disabled:opacity-40",
            SHEET_FOCUS,
          )}
        >
          {confirmLabel}
        </button>
      ) : (
        // Giữ tiêu đề ở giữa khi không có nút xác nhận.
        <span aria-hidden className="w-12" />
      )}
    </div>
  )
}
