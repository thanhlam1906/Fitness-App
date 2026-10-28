import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { Link } from "react-router"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"

/**
 * Nút lùi một màn, nằm trên tiêu đề: một kiểu cho mọi màn người tập (doc/design-gon-giao-dien-user-v1.md §4).
 * py-3 -my-3 nới vùng bấm lên 44px mà không đẩy tiêu đề xuống.
 */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "-my-3 inline-flex items-center gap-0.5 self-start rounded-[var(--radius-sm)] py-3 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        SHEET_FOCUS,
      )}
    >
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}
