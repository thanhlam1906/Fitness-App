import { useState } from "react"
import { Link } from "react-router"
import { cn } from "@/lib/cn"
import { formatEditedAt } from "@/lib/format"
import { useExercises } from "./useExercises"

type Filter = "ALL" | "ANALYZABLE" | "PLAIN"

/**
 * Cột trái của màn 12 — danh sách ~40 bài, tìm và lọc tại chỗ.
 *
 * "3 mục kiểm · sửa 14:02" lấy từ `formCheckCount` và `updatedAt` của
 * `GET /exercises` — backend đếm gộp một query, không phải 40.
 */
export function ExerciseListPanel({ activeId }: { activeId?: string }) {
  const exercises = useExercises()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")

  const rows = exercises.data ?? []
  const withChecks = rows.filter((e) => e.formCheckCount > 0).length

  const visible = (() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((ex) => {
      if (filter === "ANALYZABLE" && ex.formCheckCount === 0) return false
      if (filter === "PLAIN" && ex.formCheckCount > 0) return false
      if (needle === "") return true
      return `${ex.nameEn} ${ex.nameVi ?? ""} ${ex.slug}`.toLowerCase().includes(needle)
    })
  })()

  return (
    <div className="flex w-[290px] flex-none flex-col border-r border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="kicker num">{rows.length} bài tập</div>
        <input
          type="search"
          placeholder="Tìm bài"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2.5 h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
        />
        <div className="mt-2.5 flex gap-1.5">
          <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            Tất cả {rows.length}
          </FilterPill>
          <FilterPill active={filter === "ANALYZABLE"} onClick={() => setFilter("ANALYZABLE")}>
            Có ngưỡng {withChecks}
          </FilterPill>
          <FilterPill active={filter === "PLAIN"} onClick={() => setFilter("PLAIN")}>
            Chưa {rows.length - withChecks}
          </FilterPill>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {exercises.isLoading && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">Đang tải…</p>
        )}
        {exercises.isError && (
          <p className="p-4 text-sm text-[var(--color-danger)]">{exercises.error.message}</p>
        )}
        {visible.map((ex) => {
          const active = ex.id === activeId
          return (
            <Link
              key={ex.id}
              to={`/admin/exercises/${ex.id}`}
              className={cn(
                "block border-t border-[var(--color-surface-2)] px-4 py-2.5",
                active
                  ? "border-l-[3px] border-l-[var(--color-accent)] bg-[var(--color-surface-2)] pl-[13px]"
                  : "hover:bg-[var(--color-surface)]",
              )}
            >
              <div
                className={cn(
                  "truncate text-sm",
                  active ? "font-bold" : ex.formCheckCount > 0 ? "" : "text-[var(--color-text-muted)]",
                )}
              >
                {ex.nameVi ?? ex.nameEn}
              </div>
              <div className="num mt-px truncate text-[11px] text-[var(--color-text-muted)]">
                {ex.formCheckCount > 0 ? `${ex.formCheckCount} mục kiểm` : "chưa có ngưỡng"}
                {` · sửa ${formatEditedAt(ex.updatedAt)}`}
                {!ex.active && " · đã tắt"}
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        to="/admin/exercises/new"
        className="border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-accent)]"
      >
        + Thêm bài tập
      </Link>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "num rounded-full px-2.5 py-1 text-[11px]",
        active
          ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
          : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
      )}
    >
      {children}
    </button>
  )
}
