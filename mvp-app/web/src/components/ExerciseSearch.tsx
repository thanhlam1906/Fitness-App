import type { Ref } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import { muscleChips } from "@/lib/exerciseFilter"

/**
 * Ô tìm bài (gõ không dấu vẫn ra) và hàng chip nhóm cơ chọn một, cho danh sách bài dài
 * (doc/design-gon-giao-dien-user-v1.md §6). Lọc bằng filterExercises ở nơi gọi.
 */
export function ExerciseSearch({
  exercises,
  query,
  muscle,
  onQuery,
  onMuscle,
  className,
  inputRef,
}: {
  /** Để nơi gọi trả focus về ô tìm sau "Xoá bộ lọc" (nút đó biến mất ngay khi bấm). */
  inputRef?: Ref<HTMLInputElement>
  exercises: { muscleGroups: string[] }[]
  query: string
  muscle: string | null
  onQuery: (query: string) => void
  onMuscle: (muscle: string | null) => void
  className?: string
}) {
  const chips: { value: string | null; label: string }[] = [{ value: null, label: "Tất cả" }, ...muscleChips(exercises)]
  return (
    <div className={className}>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Tìm bài"
          placeholder="Tìm bài"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      {/* p-1 -m-1: chừa chỗ cho viền focus, khung cuộn ngang cắt mất phần tràn ra ngoài. */}
      <div role="group" aria-label="Nhóm cơ" className="-m-1 mt-1.5 flex gap-1.5 overflow-x-auto p-1 [scrollbar-width:none]">
        {chips.map((chip) => {
          const on = chip.value === muscle
          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={on}
              onClick={() => onMuscle(chip.value)}
              className={cn(
                "h-9 flex-none rounded-full border px-3.5 text-sm whitespace-nowrap",
                on
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                SHEET_FOCUS,
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Tìm không ra bài nào: nói rõ và cho bỏ lọc một chạm. */
export function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <p className="px-1 py-4 text-sm text-[var(--color-text-muted)]">
      Không có bài nào khớp.{" "}
      <button
        type="button"
        onClick={onClear}
        className={cn("rounded-[var(--radius-sm)] font-bold text-[var(--color-accent)]", SHEET_FOCUS)}
      >
        Xoá bộ lọc
      </button>
    </p>
  )
}
