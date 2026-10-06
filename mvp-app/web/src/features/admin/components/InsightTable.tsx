import type { ReactNode } from "react"
import { Link } from "react-router"

export type InsightRow = { key: string; to?: string; cells: ReactNode[] }

/**
 * Một khối của trang Buổi tập: tiêu đề, một dòng nói cách tính (để HLV biết con số nghĩa là gì),
 * rồi bảng. Ô đầu là tên; dòng có `to` thì tên là link sang form template.
 */
export function InsightTable({
  title,
  hint,
  columns,
  rows,
}: {
  title: string
  hint: string
  columns: string[]
  rows: InsightRow[]
}) {
  return (
    <section className="rounded-[var(--radius-md)] bg-[var(--color-surface)]">
      <div className="px-4 pt-4">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-[var(--color-text-muted)]">Chưa có dữ liệu trong khoảng này.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10px] tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
                {columns.map((c, i) => (
                  <th key={c} className={i === 0 ? "px-4 py-2.5 text-left font-normal" : "px-4 py-2.5 text-right font-normal"}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-[var(--color-surface-2)] last:border-0">
                  <td className="px-4 py-2.5">
                    {row.to ? (
                      <Link
                        to={row.to}
                        className="text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                      >
                        {row.cells[0]}
                      </Link>
                    ) : (
                      row.cells[0]
                    )}
                  </td>
                  {row.cells.slice(1).map((cell, i) => (
                    <td key={i} className="num px-4 py-2.5 text-right">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
