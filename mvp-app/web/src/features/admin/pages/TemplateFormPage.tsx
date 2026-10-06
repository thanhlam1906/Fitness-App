import { useParams } from "react-router"
import { TemplateListPanel } from "@/features/admin/components/TemplateListPanel"
import { TemplateEditor } from "@/features/admin/components/TemplateEditor"
import { useTemplate } from "@/features/admin/api/useTemplates"

/** Hai cột như trang Bài tập. key={id}: đổi template (hoặc sang "new") là dựng form mới từ đầu. */
export function TemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === "new"
  const existing = useTemplate(isNew ? "" : id!)

  return (
    <div className="flex min-h-0 flex-1">
      <TemplateListPanel activeId={isNew ? undefined : id} />
      {!isNew && existing.isPending ? (
        <p className="p-7 text-sm text-[var(--color-text-muted)]">Đang tải…</p>
      ) : !isNew && existing.isError ? (
        <p className="p-7 text-sm text-[var(--color-danger)]">{existing.error.message}</p>
      ) : (
        <TemplateEditor key={id} id={isNew ? null : id!} template={isNew ? null : existing.data!} />
      )}
    </div>
  )
}
