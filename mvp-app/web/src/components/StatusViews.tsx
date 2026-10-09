import type { ReactNode } from "react"
import { CircleAlert, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

/*
 * Trạng thái vẽ bằng biểu tượng thay vì chỉ một dòng chữ (doc/mockup-bieu-tuong, người dùng duyệt 10-09).
 * Lý do lỗi cụ thể vẫn là chữ: biểu tượng không nói được lý do.
 */

// Nền 16% của chính màu trạng thái, như pill của design.
const TINT = {
  muted: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  accent: "bg-[var(--color-accent-tint)] text-[var(--color-accent)]",
  success: "bg-[var(--color-success-tint)] text-[var(--color-success)]",
  warn: "bg-[var(--color-warn-tint)] text-[var(--color-warn)]",
  danger: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
}
const TEXT = {
  muted: "text-[var(--color-text-muted)]",
  warn: "text-[var(--color-warn)]",
  danger: "text-[var(--color-danger)]",
}
export type Tone = keyof typeof TINT

/** Biểu tượng trong vòng tròn nền nhạt. Đổi cỡ bằng className, vd. `size-11 [&>svg]:size-5.5`. */
export function IconCircle({
  icon: Icon,
  tone = "muted",
  className,
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  className?: string
  children?: ReactNode
}) {
  return (
    <span
      className={cn("relative grid size-15 shrink-0 place-items-center rounded-full [&>svg]:size-7", TINT[tone], className)}
    >
      {children}
      <Icon aria-hidden strokeWidth={1.8} />
    </span>
  )
}

/** Cả khối chưa có gì hoặc tải hỏng: biểu tượng, tiêu đề ngắn, dòng lý do, nút đi tiếp (kiểu 1–2). */
export function StatusBlock({
  icon,
  tone = "muted",
  title,
  detail,
  className,
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  title: string
  detail?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex flex-col items-center rounded-2xl bg-[var(--color-surface)] px-5 py-7 text-center", className)}
    >
      <IconCircle icon={icon} tone={tone} />
      <b className="mt-3.5 text-[17px]">{title}</b>
      {detail && <p className="mt-1 max-w-[300px] text-[13px] text-[var(--color-text-muted)]">{detail}</p>}
      {children && <div className="mt-4.5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

/**
 * Câu ngắn có biểu tượng đứng trước: lỗi sau khi bấm (mặc định, đỏ) hoặc trống nhỏ trong thẻ
 * (`tone="muted"` kèm biểu tượng riêng) — kiểu 5–6.
 */
export function IconText({
  icon: Icon = CircleAlert,
  tone = "danger",
  className,
  children,
}: {
  icon?: LucideIcon
  tone?: keyof typeof TEXT
  className?: string
  children: ReactNode
}) {
  return (
    <p role={tone === "danger" ? "alert" : undefined} className={cn("flex items-start gap-2 text-sm", TEXT[tone], className)}>
      <Icon aria-hidden className="mt-[0.2em] size-[1.15em] shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/** Dải nhắc có nền màu khi việc đang làm bị chặn (bài chưa chấm được, buổi chưa có bài) — kiểu 6. */
export function Notice({
  icon: Icon,
  tone,
  role,
  className,
  children,
}: {
  icon: LucideIcon
  tone: "warn" | "danger"
  role?: "alert"
  className?: string
  children: ReactNode
}) {
  return (
    <p
      role={role}
      className={cn("flex items-start gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px]", TINT[tone], className)}
    >
      <Icon aria-hidden className="mt-[0.15em] size-[1.2em] shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
