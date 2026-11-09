import { AdminHeader } from "@/features/admin/components/AdminShell"
import { TemplateListPanel } from "@/features/admin/components/TemplateListPanel"

/** Bố cục hai cột như trang Bài tập; chưa chọn template thì cột phải để trống. */
export function TemplateListPage() {
  return (
    <div className="flex min-h-0 flex-1">
      <TemplateListPanel />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Cấu hình" title="Template chương trình" />
      </div>
    </div>
  )
}
