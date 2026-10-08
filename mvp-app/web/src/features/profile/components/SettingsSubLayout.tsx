import type { ReactNode } from "react"
import { ChevronLeft, CloudOff } from "lucide-react"
import { Link } from "react-router"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { StatusBlock } from "@/components/StatusViews"
import { cn } from "@/lib/cn"

/** Khung chung của các màn con trong Cài đặt: nút "‹ Cài đặt" và tiêu đề. */
export function SettingsSubLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Link
        to="/settings"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          SHEET_FOCUS,
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Cài đặt
      </Link>
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
      {children}
    </div>
  )
}

/** Trạng thái tải/lỗi dùng chung cho các màn con; `skeleton` là khung của chính màn đó. */
export function LoadState({ error, skeleton }: { error?: Error | null; skeleton: ReactNode }) {
  return error ? (
    <StatusBlock icon={CloudOff} tone="danger" title="Không tải được dữ liệu" detail={error.message} className="mt-5" />
  ) : (
    <div role="status" aria-label="Đang tải">
      {skeleton}
    </div>
  )
}
