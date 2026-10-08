import type { ReactNode } from "react"

/** Thẻ gập bằng <details> của trình duyệt — tự có bàn phím, trình đọc màn hình, không cần state. */
export function Section({
  title,
  meta,
  open,
  children,
}: {
  title: string
  meta: string
  open?: boolean
  children: ReactNode
}) {
  return (
    <details open={open} className="group rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-3.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-md)] py-4 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="num font-semibold text-[var(--color-text-muted)]">· {meta}</span>
        <span
          aria-hidden
          className="ml-auto text-xl text-[var(--color-text-muted)] transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  )
}
