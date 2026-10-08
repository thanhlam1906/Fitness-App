import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

/** Dòng bảng admin khi không có dữ liệu: biểu tượng lớn giữa bảng, câu ngắn bên dưới (doc/mockup-bieu-tuong kiểu 5). */
export function TableEmpty({ icon: Icon, colSpan, children }: { icon: LucideIcon; colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-7">
        <div className="flex flex-col items-center gap-2 text-[13px] text-[var(--color-text-muted)]">
          <Icon aria-hidden className="size-6.5" strokeWidth={1.8} />
          {children}
        </div>
      </td>
    </tr>
  )
}
