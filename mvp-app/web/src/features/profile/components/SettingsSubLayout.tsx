import type { ReactNode } from "react"
import { CloudOff } from "lucide-react"
import { BackLink } from "@/components/BackLink"
import { StatusBlock } from "@/components/StatusViews"

/** Khung chung của các màn con trong Cài đặt: nút "‹ Cài đặt" và tiêu đề. */
export function SettingsSubLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <BackLink to="/settings">Cài đặt</BackLink>
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
