import { useParams } from "react-router"
import { IconText } from "@/components/StatusViews"
import { TemplateListPanel } from "@/features/admin/components/TemplateListPanel"
import { TemplateEditor } from "@/features/admin/components/TemplateEditor"
import { ProgressionPreview } from "@/features/admin/components/ProgressionPreview"
import { Skeleton } from "@/components/ui/skeleton"
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
        // Khung của editor: header, ô tên, khối thông tin, khối các buổi.
        <div role="status" aria-label="Đang tải" className="min-w-0 flex-1">
          <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-7 py-4.5">
            <div className="flex-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-1.5 h-6 w-56" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="max-w-[900px] space-y-4 px-7 py-5">
            <Skeleton className="h-11" />
            <Skeleton className="h-52" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : !isNew && existing.isError ? (
        <IconText className="p-7">{existing.error.message}</IconText>
      ) : (
        <TemplateEditor
          key={id}
          id={isNew ? null : id!}
          template={isNew ? null : existing.data!}
          renderPreview={(onHit, nameOf, needsLoad) => (
            <ProgressionPreview onHit={onHit} nameOf={nameOf} needsLoad={needsLoad} />
          )}
        />
      )}
    </div>
  )
}
