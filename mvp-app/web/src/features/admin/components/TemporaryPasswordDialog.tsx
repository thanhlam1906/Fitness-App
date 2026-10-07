import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

/** Mật khẩu tạm chỉ hiện một lần: server không lưu bản rõ, đóng hộp này là mất. */
export function TemporaryPasswordDialog({
  email,
  password,
  onClose,
}: {
  email: string
  password: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function copy() {
    await navigator.clipboard.writeText(password)
    setCopied(true)
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] backdrop:bg-[var(--color-bg)]/70"
    >
      <h2 className="text-lg font-bold">Mật khẩu tạm</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Gửi mật khẩu này cho <span className="font-semibold">{email}</span>. Lần đăng nhập đầu tiên họ phải đặt mật
        khẩu mới. <strong>Chỉ hiện một lần</strong> — đóng hộp này là không xem lại được.
      </p>
      <div className="num mt-4 rounded-lg bg-[var(--color-surface-2)] px-4 py-3 text-center text-xl font-bold tracking-[0.12em] select-all">
        {password}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? "Đã chép" : "Chép"}
        </Button>
        <Button onClick={() => ref.current?.close()}>Xong</Button>
      </div>
    </dialog>
  )
}
