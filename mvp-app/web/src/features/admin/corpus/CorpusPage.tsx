import { useMutation } from "@tanstack/react-query"
import { AdminHeader } from "@/components/AdminShell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/api/client"

type ReloadResult = { documents: number; chunks: number }

/**
 * Kho kiến thức trợ lý — concept-chatbot-v1.md §7. Nút bấm gọi đúng
 * POST /admin/corpus/reload đã có sẵn ở backend (CorpusAdminController).
 *
 * Quy trình vẫn thủ công có chủ đích: PDF → Docling (terminal, người soát
 * chất lượng) → content/corpus/*.md → bấm nút này để nạp vào DB. Không tự
 * động hoá bước convert — cần mắt người kiểm trước khi vào kho (§7, và thực
 * tế: bài 3 từng vỡ dấu tiếng Việt lúc convert, phải soát mới thấy).
 */
export function CorpusPage() {
  const reload = useMutation({
    mutationFn: () => api.post<ReloadResult>("/admin/corpus/reload", {}),
  })

  return (
    <>
      <AdminHeader group="Cấu hình" title="Kho kiến thức" />

      <div className="overflow-auto px-7 py-5.5">
        <Card className="max-w-xl space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Nạp lại toàn bộ file <code className="num">content/corpus/*.md</code> vào cơ sở dữ
            liệu. Chạy sau khi đã convert PDF bằng Docling và soát xong nội dung — xem hướng dẫn
            convert trong tài liệu dự án.
          </p>

          <Button onClick={() => reload.mutate()} disabled={reload.isPending}>
            {reload.isPending ? "Đang nạp…" : "Nạp lại"}
          </Button>

          {reload.isSuccess && (
            <p className="text-sm text-[var(--color-success)]">
              Đã nạp {reload.data.documents} tài liệu, {reload.data.chunks} đoạn.
            </p>
          )}
          {reload.isError && (
            <p className="text-sm text-[var(--color-danger)]">Nạp thất bại: {reload.error.message}</p>
          )}
        </Card>
      </div>
    </>
  )
}
