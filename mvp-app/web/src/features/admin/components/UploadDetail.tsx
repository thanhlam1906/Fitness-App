import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/format"
import { ChunkList } from "./ChunkList"
import { defaultTitle } from "@/features/admin/utils/corpusFiles"
import { useDiscardUpload, usePublishUpload, useUpload } from "@/features/admin/api/useCorpus"

/** Cột phải khi chọn một file chưa vào kho: đang trích, lỗi, hoặc chờ duyệt. */
export function UploadDetail({ id }: { id: string }) {
  const upload = useUpload(id)
  const publish = usePublishUpload()
  const discard = useDiscardUpload()
  const navigate = useNavigate()
  // null = admin chưa sửa, dùng tên mặc định từ tên file.
  const [title, setTitle] = useState<string | null>(null)

  if (upload.isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  if (upload.isError) return <p className="text-sm text-[var(--color-danger)]">{upload.error.message}</p>
  const u = upload.data
  if (!u) return null

  const onDiscard = () => discard.mutate(id, { onSuccess: () => navigate("/admin/corpus") })
  const heading = (kicker: string) => (
    <>
      <div className="kicker">{kicker}</div>
      <h2 className="mt-1 text-[22px] leading-tight font-extrabold break-words">{u.fileName}</h2>
    </>
  )

  if (u.status === "PROCESSING") {
    return (
      <>
        {heading("Đang trích")}
        <p className="mt-4 flex items-center gap-3 text-sm text-[var(--color-warn)]">
          <span className="size-4 flex-none animate-spin rounded-full border-2 border-current border-r-transparent" />
          Máy trích đang đọc từng trang (chế độ hybrid). Bài giảng vài chục trang mất vài phút, sách
          dày có thể mất cả giờ.
        </p>
        <p className="mt-2.5 text-sm text-[var(--color-text-muted)]">
          Có thể rời màn này, quay lại sau. Xong sẽ chuyển sang “Chờ duyệt”.
        </p>
      </>
    )
  }

  if (u.status === "FAILED") {
    return (
      <>
        {heading("Lỗi")}
        <Card className="mt-4.5 max-w-2xl space-y-3">
          <p className="rounded-[var(--radius-md)] bg-[var(--color-danger-tint)] px-3 py-2.5 text-sm text-[var(--color-danger)]">
            {u.error}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">File PDF đã xoá khỏi máy chủ. Sửa xong thì thả lại.</p>
          <Button variant="secondary" size="sm" onClick={onDiscard} disabled={discard.isPending}>
            Bỏ
          </Button>
        </Card>
      </>
    )
  }

  const shownTitle = title ?? defaultTitle(u.fileName)
  return (
    <>
      {heading("Chờ duyệt")}
      <p className="num mt-1.5 text-sm text-[var(--color-text-muted)]">
        {u.chunks.length} đoạn · thả lên {formatDate(u.createdAt)}
      </p>
      <Card className="mt-4.5 max-w-2xl space-y-3">
        <div>
          <Label htmlFor="corpus-title">Tên hiển thị</Label>
          <Input
            id="corpus-title"
            className="mt-1.5"
            value={shownTitle}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
            Người dùng thấy tên này ở dòng “Nguồn” dưới câu trả lời của trợ lý.
          </p>
        </div>
        {u.replaces && (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-warn-tint)] px-3 py-2.5 text-sm text-[var(--color-warn)]">
            Sẽ <b>thay</b> bản đang có cùng tên file (“{u.replaces.title}”, nạp {formatDate(u.replaces.ingestedAt)},{" "}
            <span className="num">{u.replaces.chunkCount}</span> đoạn).
          </p>
        )}
        {publish.isError && <p className="text-sm text-[var(--color-danger)]">{publish.error.message}</p>}
        <div className="flex gap-2.5">
          <Button
            size="sm"
            disabled={shownTitle.trim() === "" || publish.isPending || publish.isSuccess}
            onClick={() =>
              publish.mutate(
                { id, title: shownTitle.trim() },
                { onSuccess: (r) => navigate(`/admin/corpus/documents/${r.documentId}`) },
              )
            }
          >
            {publish.isPending ? "Đang nạp…" : "Đưa vào trợ lý"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onDiscard} disabled={discard.isPending || publish.isPending}>
            Bỏ
          </Button>
        </div>
      </Card>
      <div className="mt-6.5 flex items-baseline gap-2.5">
        <b className="text-[15px]">Các đoạn trợ lý sẽ đọc</b>
        <span className="kicker">soát dấu tiếng Việt ở đây</span>
      </div>
      <ChunkList
        chunks={u.chunks.map((c, i) => ({ key: String(i), number: i + 1, heading: c.heading, content: c.content }))}
      />
    </>
  )
}
