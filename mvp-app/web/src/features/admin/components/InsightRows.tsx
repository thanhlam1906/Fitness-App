import type { ReactNode } from "react"
import { Link } from "react-router"
import { percent } from "@/features/admin/utils/workoutInsights"
import { cn } from "@/lib/cn"

const EMPTY = <p className="py-3 text-sm text-[var(--color-text-muted)]">Chưa có dữ liệu trong khoảng này.</p>

/**
 * Một dòng của khối cột: tên + dòng phụ, phần đồ hoạ, giá trị bên phải. Có `to` thì cả dòng là link
 * sang form template (chỉ khi đang lọc một template).
 */
function InsightRow({
  name,
  sub,
  to,
  graphic,
  value,
  below = false,
}: {
  name: string
  sub: string
  to?: string
  graphic: ReactNode
  value: ReactNode
  /** Thanh nằm dưới tên, chạy hết chiều ngang: dùng khi thẻ hẹp. */
  below?: boolean
}) {
  const label = (
    <span className="min-w-0 text-[13px] leading-tight">
      {name}
      {to && <span className="ml-1.5 text-[11px] text-[var(--color-accent)]">sửa ›</span>}
      <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">{sub}</span>
    </span>
  )
  const number = <span className="num text-right text-[13px] font-bold">{value}</span>
  const body = below ? (
    <>
      {label}
      {number}
      <span className="col-span-2">{graphic}</span>
    </>
  ) : (
    <>
      {label}
      {graphic}
      {number}
    </>
  )
  const cls = cn(
    "-mx-1 grid gap-2.5 rounded-lg px-1 py-0.5 hover:bg-[var(--color-surface-2)]",
    below ? "grid-cols-[minmax(0,1fr)_auto] items-end gap-y-1.5" : "grid-cols-[minmax(0,13rem)_1fr_3.5rem] items-center",
  )
  return (
    <li title={`${name}: ${sub}`}>
      {to ? (
        <Link
          to={to}
          className={cn(
            cls,
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

export type BarRow = { key: string; name: string; sub: string; value: number; label: string; to?: string; color?: string }

/** Cột ngang top 5: thanh dài theo `value / max` (tỉ lệ thì max = 1), số ở đầu thanh. `row.color` đè màu chung. */
export function BarList({
  rows,
  color,
  max = 1,
  below = false,
}: {
  rows: BarRow[]
  color: string
  max?: number
  below?: boolean
}) {
  if (rows.length === 0) return EMPTY
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <InsightRow
          key={r.key}
          name={r.name}
          sub={r.sub}
          to={r.to}
          value={r.label}
          below={below}
          graphic={
            <span className="h-3.5 rounded-r-[4px] bg-[var(--color-surface-2)]">
              <span
                className="block h-full rounded-r-[4px]"
                style={{ width: `${max === 0 ? 0 : (r.value / max) * 100}%`, background: r.color ?? color }}
              />
            </span>
          }
        />
      ))}
    </ul>
  )
}

export type StackedRow = { key: string; name: string; sub: string; up: number; hold: number; down: number; to?: string }

const PARTS = [
  ["up", "Tăng", "var(--color-success)"],
  ["hold", "Giữ", "var(--color-chart-neutral)"],
  ["down", "Giảm", "var(--color-danger)"],
] as const

/** Thanh xếp chồng Tăng/Giữ/Giảm theo tỉ lệ, khe 2px giữa các phần; giá trị là % giảm. */
export function StackedList({ rows }: { rows: StackedRow[] }) {
  if (rows.length === 0) return EMPTY
  return (
    <>
      <div className="mb-2.5 flex gap-3.5 text-xs text-[var(--color-text-muted)]">
        {PARTS.map(([, label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const total = r.up + r.hold + r.down
          return (
            <InsightRow
              key={r.key}
              name={r.name}
              sub={r.sub}
              to={r.to}
              value={
                <>
                  {percent(r.down, total)}
                  <span className="block text-[10px] font-normal text-[var(--color-text-muted)]">giảm</span>
                </>
              }
              graphic={
                <span className="flex h-3.5 gap-0.5">
                  {PARTS.map(([k, , color]) =>
                    r[k] > 0 ? (
                      <span
                        key={k}
                        className="h-full last:rounded-r-[4px]"
                        style={{ width: `${(r[k] / total) * 100}%`, background: color }}
                      />
                    ) : null,
                  )}
                </span>
              }
            />
          )
        })}
      </ul>
    </>
  )
}
