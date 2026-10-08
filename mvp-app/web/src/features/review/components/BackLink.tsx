import type { ReactNode } from "react"
import { Link } from "react-router"

/** Link lùi một bước trong luồng chấm form, nằm trên tiêu đề màn. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="self-start rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    >
      {children}
    </Link>
  )
}
