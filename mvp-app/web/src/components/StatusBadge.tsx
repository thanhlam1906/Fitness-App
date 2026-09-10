import { cn } from "@/lib/cn"

/**
 * Trạng thái buổi tập (màn 4) và trạng thái chấm clip (màn 9) — cùng một
 * component vì cùng một ý nghĩa hình ảnh.
 *
 * §3.2: ngày nghỉ và buổi bỏ lỡ KHÔNG tô màu, chỉ mờ đi. Tô đỏ buổi bỏ lỡ là
 * trách móc người dùng — sai với sản phẩm này.
 */
const STYLES: Record<string, { label: string; tone: string }> = {
  // buổi tập
  PLANNED: { label: "Chưa tập", tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]" },
  DONE: { label: "Đã xong ✓", tone: "text-[var(--color-success)] bg-[var(--color-success-tint)]" },
  SKIPPED: {
    label: "Đã bỏ qua",
    tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]",
  },
  MISSED: { label: "Bỏ lỡ", tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]" },
  // chấm clip
  PENDING: { label: "Đang chờ", tone: "text-[var(--color-warn)] bg-[var(--color-warn-tint)]" },
  PROCESSING: {
    label: "Đang phân tích",
    tone: "text-[var(--color-warn)] bg-[var(--color-warn-tint)]",
  },
  FAILED: { label: "Chấm lỗi", tone: "text-[var(--color-danger)] bg-[var(--color-danger-tint)]" },
  REJECTED: {
    label: "Clip chưa dùng được",
    tone: "text-[var(--color-danger)] bg-[var(--color-danger-tint)]",
  },
}

/**
 * `text` là kiểu trong hàng ngày của màn 4 — design để chữ trần, không viên
 * thuốc, vì hàng đã chật. `pill` dùng ở bảng admin và danh sách chấm clip.
 */
export function StatusBadge({ status, variant = "pill" }: { status: string; variant?: "pill" | "text" }) {
  const style = STYLES[status] ?? {
    label: status,
    tone: "text-[var(--color-text-muted)] bg-[var(--color-surface-2)]",
  }
  if (variant === "text") {
    return (
      <span className={cn("text-xs font-semibold whitespace-nowrap", style.tone.split(" ")[0])}>
        {style.label}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        style.tone,
      )}
    >
      {style.label}
    </span>
  )
}
