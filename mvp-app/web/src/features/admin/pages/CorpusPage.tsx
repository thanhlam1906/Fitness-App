import { useParams } from "react-router"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { CorpusListPanel } from "@/features/admin/components/CorpusListPanel"
import { DocumentDetail } from "@/features/admin/components/DocumentDetail"
import { UploadDetail } from "@/features/admin/components/UploadDetail"

/**
 * Kho kiến thức trợ lý — doc/design-nap-tai-lieu-v1.md §7, mockup doc/mockup-corpus/demo.html.
 * Thả PDF → máy trích (hybrid) → admin soát từng đoạn → đưa vào trợ lý. Bước soát là bắt buộc:
 * bài 3 từng vỡ dấu tiếng Việt lúc convert, phải đọc mới thấy.
 */
export function CorpusPage() {
  const { uploadId, documentId } = useParams()

  return (
    <>
      <AdminHeader group="Cấu hình" title="Kho kiến thức" />
      <div className="flex min-h-0 flex-1">
        <CorpusListPanel activeId={uploadId ?? documentId} />
        <div className="min-w-0 flex-1 overflow-auto px-7 pt-6 pb-10">
          {uploadId ? (
            <UploadDetail key={uploadId} id={uploadId} />
          ) : documentId ? (
            <DocumentDetail key={documentId} id={documentId} />
          ) : (
            <p className="pt-24 text-center text-sm text-[var(--color-text-muted)]">Chọn một tài liệu ở cột trái.</p>
          )}
        </div>
      </div>
    </>
  )
}
