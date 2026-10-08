import type { HTMLAttributes } from "react"
import { cn } from "@/lib/cn"

/**
 * Khối xám có vệt sáng lướt (`.skeleton` trong styles/index.css), giữ chỗ cho nội dung đang tải.
 * Đặt kích thước bằng className. Là span để đặt được cả trong <p>; `block` cho nó nhận h-/w-.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn("skeleton block rounded-[var(--radius-md)]", className)}
      {...props}
    />
  )
}

/** `count` dòng giữ chỗ cho danh sách cột trái của admin: tên một dòng, dòng phụ nhỏ bên dưới. */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Đang tải">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border-t border-[var(--color-surface-2)] px-4 py-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** Khung của bảng admin: một dải đầu bảng rồi `rows` dòng. */
export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Đang tải"
      className={cn("flex flex-col gap-px overflow-hidden rounded-[var(--radius-md)]", className)}
    >
      <Skeleton className="h-10 rounded-none" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[46px] rounded-none" />
      ))}
    </div>
  )
}

/** Khung chung cho một màn đang tải: tiêu đề + `rows` khối nội dung. */
export function PageSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Đang tải" className={cn("space-y-4", className)}>
      <Skeleton className="h-7 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}
