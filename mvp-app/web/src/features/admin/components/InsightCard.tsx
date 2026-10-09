import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

/** Ô icon tô nhạt theo màu của khối: phân biệt khối bằng màu + hình, không mang nghĩa trạng thái. */
export function IconChip({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: string; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center",
        size === "lg" ? "size-[34px] rounded-[9px]" : "size-7 rounded-lg",
      )}
      style={{ color: tone, background: `color-mix(in srgb, ${tone} 16%, transparent)` }}
    >
      <Icon className={size === "lg" ? "size-[18px]" : "size-4"} aria-hidden />
    </span>
  )
}

/** Khung chung của mọi khối trang Buổi tập: icon, tiêu đề, một dòng nói con số được tính thế nào. */
export function InsightCard({
  icon,
  tone,
  title,
  hint,
  aside,
  className,
  children,
}: {
  icon: LucideIcon
  tone: string
  title: string
  hint: string
  /** Số lớn ở góc phải tiêu đề, như tổng của khối. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4", className)}>
      <div className="flex items-center gap-2.5">
        <IconChip icon={icon} tone={tone} />
        <h2 className="flex-1 text-[15px] font-bold">{title}</h2>
        {aside !== undefined && <span className="num text-[22px] leading-none font-bold">{aside}</span>}
      </div>
      <p className="mt-1.5 mb-3 text-xs text-[var(--color-text-muted)]">{hint}</p>
      {children}
    </section>
  )
}

/** Ô tổng đầu trang: số lớn + đơn vị + một dòng phụ. */
export function StatTile({
  icon,
  tone,
  label,
  value,
  unit,
  detail,
}: {
  icon: LucideIcon
  tone: string
  label: string
  value: string
  unit: string
  detail: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3.5">
      <IconChip icon={icon} tone={tone} size="lg" />
      <div className="min-w-0">
        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
        <div className="mt-0.5 text-[26px] leading-tight font-bold">
          {value}
          <span className="num ml-1 text-[13px] font-medium text-[var(--color-text-muted)]">{unit}</span>
        </div>
        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{detail}</div>
      </div>
    </div>
  )
}
