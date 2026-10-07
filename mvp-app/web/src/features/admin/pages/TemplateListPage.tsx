import { AdminHeader } from "@/features/admin/components/AdminShell"
import { TemplateListPanel } from "@/features/admin/components/TemplateListPanel"

/** Bố cục hai cột như trang Bài tập; chưa chọn template thì cột phải để trống. */
export function TemplateListPage() {
  return (
    <div className="flex min-h-0 flex-1">
      <TemplateListPanel />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Cấu hình" title="Template chương trình" />
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
          Chọn một template ở cột trái để sửa, hoặc bấm “+ Thêm template”.
        </div>
      </div>
    </div>
  )
}
