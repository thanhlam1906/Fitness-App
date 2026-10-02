import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { ChunkList } from "./ChunkList"
import { useDocument, useRemoveDocument } from "./useCorpus"

/** Cột phải khi chọn một tài liệu trong kho: câu trả lời bị báo sai, các đoạn, nút gỡ. */
export function DocumentDetail({ id }: { id: string }) {
  const doc = useDocument(id)
  const remove = useRemoveDocument()
  const navigate = useNavigate()

  if (doc.isLoading) return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  if (doc.isError) return <p className="text-sm text-[var(--color-danger)]">{doc.error.message}</p>
  const d = doc.data
  if (!d) return null

  const flagged = new Set(d.wrongAnswers.flatMap((w) => w.chunkOrds))
  const onRemove = () => {
    const ok = window.confirm(
      `Gỡ “${d.title}” khỏi trợ lý?\n\nTrợ lý thôi dùng ${d.chunkCount} đoạn này từ câu hỏi tiếp theo. Muốn dùng lại phải thả lại PDF.`,
    )
    if (ok) remove.mutate(id, { onSuccess: () => navigate("/admin/corpus") })
  }

  return (
    <>
      <div className="kicker">Trong kho</div>
      <h2 className="mt-1 text-[22px] leading-tight font-extrabold break-words">{d.title}</h2>
      <p className="num mt-1.5 text-sm text-[var(--color-text-muted)]">
        {d.source} · nạp {formatDate(d.ingestedAt)} · {d.chunkCount} đoạn
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4 text-[var(--color-danger)]"
        onClick={onRemove}
        disabled={remove.isPending}
      >
        Gỡ khỏi trợ lý
      </Button>
      {remove.isError && <p className="mt-2 text-sm text-[var(--color-danger)]">{remove.error.message}</p>}

      {d.wrongAnswers.length > 0 && (
        <>
          <div className="mt-6.5 flex items-baseline gap-2.5">
            <b className="text-[15px] text-[var(--color-danger)]">Câu trả lời bị báo sai</b>
            <span className="kicker num">{d.wrongAnswers.length}</span>
          </div>
          {d.wrongAnswers.map((w) => (
            <div
              key={w.messageId}
              className="mt-2.5 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/35 bg-[var(--color-surface)] px-3.5 py-3"
            >
              {w.question && <div className="text-[13px] font-bold">“{w.question}”</div>}
              <p className="mt-1.5 text-[13px] leading-relaxed">{w.answer}</p>
              {w.note ? (
                <p className="mt-2 text-[13px] text-[var(--color-danger)]">Người dùng ghi: {w.note}</p>
              ) : (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">Người dùng không ghi chú.</p>
              )}
              <p className="num mt-2 text-xs text-[var(--color-text-muted)]">
                {formatDate(w.createdAt)} · đoạn đã dùng:{" "}
                {w.chunkOrds.map((ord, i) => (
                  <span key={ord}>
                    {i > 0 && ", "}
                    <button
                      type="button"
                      className="text-[var(--color-accent)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                      onClick={() =>
                        document
                          .getElementById(`chunk-${ord + 1}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                    >
                      #{ord + 1}
                    </button>
                  </span>
                ))}
              </p>
            </div>
          ))}
        </>
      )}

      <div className="mt-6.5">
        <b className="text-[15px]">Các đoạn trợ lý đang đọc</b>
      </div>
      <ChunkList
        chunks={d.chunks.map((c) => ({
          key: c.id,
          number: c.ord + 1,
          heading: c.heading,
          content: c.content,
          flagged: flagged.has(c.ord),
        }))}
      />
    </>
  )
}
