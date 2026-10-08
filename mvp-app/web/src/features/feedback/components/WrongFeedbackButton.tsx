import { useState } from "react"
import { Input } from "@/components/ui/input"
import { IconText } from "@/components/StatusViews"
import { useReportWrong } from "@/features/feedback/api/useReportWrong"
import type { FeedbackSource } from "@/features/feedback/types"

/**
 * Đặc tả yêu cầu nút "góp ý này sai" ở MỌI góp ý do máy sinh ra — kết quả chấm
 * form (màn 9), quyết định tải (màn 4) lẫn câu trả lời trợ lý. Một component thì
 * không sót chỗ nào (§4.3 concept-frontend-v1.md).
 *
 * Design để nó là chữ mờ cỡ nhỏ, cố tình không nổi: nó là lối thoát khi máy
 * sai, không phải hành động app muốn người dùng làm.
 */
export function WrongFeedbackButton({ source, hint }: { source: FeedbackSource; hint?: string }) {
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)

  const send = useReportWrong(source)

  if (send.isSuccess) {
    return <span className="text-xs text-[var(--color-text-muted)]">Đã ghi nhận. Cảm ơn bạn.</span>
  }

  if (!open) {
    return (
      <span className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          Góp ý này sai?
        </button>
        {hint && <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span>}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Vì sao góp ý này sai"
        placeholder="Sai ở chỗ nào? (tuỳ chọn)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-9 min-w-48 flex-1 text-xs"
      />
      <button
        type="button"
        onClick={() => send.mutate(note)}
        disabled={send.isPending}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-xs hover:border-[var(--color-text-muted)] disabled:opacity-50"
      >
        {send.isPending ? "Đang gửi…" : "Gửi"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        Huỷ
      </button>
      {send.isError && <IconText className="text-xs">Gửi thất bại.</IconText>}
    </div>
  )
}
