import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { ExerciseImage } from "@/components/ExerciseImage"
import { Sheet, SHEET_FOCUS, SheetHeader } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import type { Exercise } from "@/features/review/types"

/** "Sai bài?" và "Chưa nhận ra bài" — chọn bài đúng rồi chấm lại từ số đo đã lưu (spec §3.3). */
export function ExercisePickerSheet({
  open,
  onClose,
  currentId,
  pending,
  onPick,
}: {
  open: boolean
  onClose: () => void
  currentId: string | null
  pending: boolean
  onPick: (exerciseId: string) => void
}) {
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: () => api.get<Exercise[]>("/exercises") })
  const list = (exercises.data ?? []).filter((e) => e.active && e.analyzable && e.id !== currentId)

  return (
    <Sheet open={open} onClose={onClose} label="Chọn bài bạn đã tập" dismissible={!pending}>
      <SheetHeader title="Bạn đã tập bài nào?" onCancel={onClose} />
      <div className="flex flex-col gap-1.5 overflow-y-auto px-3 pb-6">
        {exercises.isLoading && <p className="px-1 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {list.map((e) => (
          <button
            key={e.id}
            type="button"
            disabled={pending}
            onClick={() => onPick(e.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-left disabled:opacity-50",
              SHEET_FOCUS,
            )}
          >
            <ExerciseImage slug={e.slug} alt={e.nameVi ?? e.nameEn} variant="thumb" />
            <span className="min-w-0 flex-1 truncate font-semibold">{e.nameVi ?? e.nameEn}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
