import { useState } from "react"
import { IconText } from "@/components/StatusViews"
import { Link } from "react-router"
import { ListRowsSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { normalizeVi } from "@/lib/exerciseFilter"
import { formatEditedAt } from "@/lib/format"
import { useExercises } from "@/features/exercise/api/useExercises"

type Filter = "ALL" | "ANALYZABLE" | "PLAIN" | "DRAFT" | "DELETED"

// Ba trạng thái của bài (doc/design-thu-vien-bai-v1.md §4.2): đang bật, chưa duyệt (bài mới nạp), đã xoá.
// Hai cờ không đủ phân biệt nếu chỉ nhìn `active`: bài tắt có thể là chưa duyệt hoặc đã xoá.
const isDeleted = (ex: { active: boolean; draft: boolean }) => !ex.active && !ex.draft

/**
 * Cột trái của màn 12 — danh sách ~40 bài, tìm và lọc tại chỗ.
 *
 * "3 mục kiểm · sửa 14:02" lấy từ `formCheckCount` và `updatedAt` của
 * `GET /exercises` — backend đếm gộp một query, không phải 40.
 */
export function ExerciseListPanel({ activeId }: { activeId?: string }) {
  const exercises = useExercises({ all: true })
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")

  const rows = exercises.data ?? []
  const withChecks = rows.filter((e) => e.formCheckCount > 0).length
  const draftCount = rows.filter((e) => e.draft).length
  const deletedCount = rows.filter(isDeleted).length

  const visible = (() => {
    const needle = normalizeVi(query.trim())
    return rows.filter((ex) => {
      if (filter === "ANALYZABLE" && ex.formCheckCount === 0) return false
      if (filter === "PLAIN" && ex.formCheckCount > 0) return false
      if (filter === "DRAFT" && !ex.draft) return false
      if (filter === "DELETED" && !isDeleted(ex)) return false
      if (needle === "") return true
      return normalizeVi(`${ex.nameEn} ${ex.nameVi ?? ""} ${ex.slug}`).includes(needle)
    })
  })()

  return (
    <div className="flex w-[290px] flex-none flex-col border-r border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <input
          type="search"
          placeholder="Tìm bài"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] outline-none focus:border-[var(--color-accent)]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            Tất cả {rows.length}
          </FilterPill>
          <FilterPill active={filter === "ANALYZABLE"} onClick={() => setFilter("ANALYZABLE")}>
            Có quy chuẩn {withChecks}
          </FilterPill>
          <FilterPill active={filter === "PLAIN"} onClick={() => setFilter("PLAIN")}>
            Chưa {rows.length - withChecks}
          </FilterPill>
          <FilterPill active={filter === "DRAFT"} onClick={() => setFilter("DRAFT")}>
            Chưa duyệt {draftCount}
          </FilterPill>
          <FilterPill active={filter === "DELETED"} onClick={() => setFilter("DELETED")}>
            Đã xoá {deletedCount}
          </FilterPill>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {exercises.isLoading && <ListRowsSkeleton count={8} />}
        {exercises.isError && (
          <IconText className="p-4">{exercises.error.message}</IconText>
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
              {/* Nhãn nằm ở dòng tên, không ở dòng phụ: dòng phụ bị cắt khi dài, mà bài mới nạp là bài chưa
                  chấm form, chưa có ảnh nên dòng phụ của nó luôn dài. */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    active ? "font-bold" : ex.formCheckCount > 0 ? "" : "text-[var(--color-text-muted)]",
                  )}
                >
                  {ex.nameEn}
                </div>
                {ex.draft && (
                  <span className="shrink-0 rounded-full bg-[var(--color-warn-tint)] px-1.5 py-px text-[10px] text-[var(--color-warn)]">
                    Chưa duyệt
                  </span>
                )}
              </div>
              <div className="num mt-px truncate text-[11px] text-[var(--color-text-muted)]">
                {ex.formCheckCount > 0 ? `${ex.formCheckCount} khớp cần kiểm` : "chưa chấm form"}
                {` · sửa ${formatEditedAt(ex.updatedAt)}`}
                {!ex.hasStillImage && <span className="text-[var(--color-warn)]"> · chưa có ảnh</span>}
                {/* Bài chưa duyệt cũng tắt nhưng đã có nhãn riêng ở dòng tên: "đã tắt" chỉ dành cho bài đã xoá. */}
                {isDeleted(ex) && " · đã tắt"}
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
        "num rounded-full px-2.5 py-1 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        active
          ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
          : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
      )}
    >
      {children}
    </button>
  )
}
