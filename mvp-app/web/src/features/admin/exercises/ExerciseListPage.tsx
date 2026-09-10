import { AdminHeader } from "@/components/AdminShell"
import { ExerciseListPanel } from "./ExerciseListPanel"

/**
 * Màn 12 concept-frontend-v1.md khi chưa chọn bài nào — vẫn là bố cục hai cột
 * của design, cột phải để trống thay vì đổi hẳn sang một màn khác.
 */
export function ExerciseListPage() {
  return (
    <div className="flex min-h-0 flex-1">
      <ExerciseListPanel />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Chấm form" title="Bài tập và ngưỡng" />
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
          Chọn một bài ở cột trái để sửa ngưỡng chấm.
        </div>
      </div>
    </div>
  )
}
