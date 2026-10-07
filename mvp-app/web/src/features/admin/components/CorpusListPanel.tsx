import { useRef, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { splitPdfs } from "@/features/admin/utils/corpusFiles"
import type { UploadStatus } from "@/features/admin/types"
import { useDocuments, useUploadPdf, useUploads } from "@/features/admin/api/useCorpus"

/** Cột trái màn Kho kiến thức: vùng thả, file đang xử lý, tài liệu trong kho (mockup doc/mockup-corpus). */
export function CorpusListPanel({ activeId }: { activeId?: string }) {
  const uploads = useUploads()
  const documents = useDocuments()
  const pending = uploads.data ?? []
  const docs = documents.data ?? []
  const error = uploads.error ?? documents.error

  return (
    <div className="flex w-[340px] flex-none flex-col border-r border-[var(--color-border)]">
      <DropZone />
      <div className="min-h-0 flex-1 overflow-auto pb-4">
        {error && <p className="px-4 text-sm text-[var(--color-danger)]">{error.message}</p>}
        {pending.length > 0 && (
          <>
            <GroupLabel>
              Đang xử lý · <span className="num">{pending.length}</span>
            </GroupLabel>
            {pending.map((u) => (
              <Row key={u.id} to={`/admin/corpus/uploads/${u.id}`} active={u.id === activeId} title={u.fileName}>
                <StatusPill status={u.status} />
              </Row>
            ))}
          </>
        )}
        <GroupLabel>
          Trong kho · <span className="num">{docs.length}</span>
        </GroupLabel>
        {documents.isLoading && <p className="px-4 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {docs.map((d) => (
          <Row key={d.id} to={`/admin/corpus/documents/${d.id}`} active={d.id === activeId} title={d.title}>
            <span className="num">
              {d.source} · {formatDate(d.ingestedAt)} · {d.chunkCount} đoạn
            </span>
            {d.wrongCount > 0 && (
              <Pill tone="danger">
                <span className="num">{d.wrongCount}</span> lần bị báo sai
              </Pill>
            )}
          </Row>
        ))}
      </div>
    </div>
  )
}

function DropZone() {
  const upload = useUploadPdf()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Gửi lần lượt từng file: backend cũng trích lần lượt, gửi song song không nhanh hơn.
  async function add(files: File[]) {
    const { pdfs, rejected } = splitPdfs(files)
    const failed: string[] = []
    for (const file of pdfs) {
      try {
        const row = await upload.mutateAsync(file)
        navigate(`/admin/corpus/uploads/${row.id}`)
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "gửi không được."}`)
      }
    }
    setErrors([...rejected, ...failed])
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Thả file PDF vào đây hoặc bấm để chọn"
      onClick={(e) => {
        if (e.target !== input.current) input.current?.click()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          input.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void add([...e.dataTransfer.files])
      }}
      className={cn(
        "m-4 cursor-pointer rounded-[var(--radius-lg)] border-[1.5px] border-dashed px-3.5 py-4.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
        over
          ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)]"
          : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-tint)]",
      )}
    >
      <div className="text-sm font-bold">Thả file PDF vào đây</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">
        {upload.isPending ? "Đang gửi…" : "hoặc bấm để chọn · nhiều file cùng lúc · tối đa 60 MB mỗi file"}
      </div>
      {errors.map((m) => (
        <p key={m} className="mt-2 text-xs text-[var(--color-danger)]">
          {m}
        </p>
      ))}
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          void add([...(e.target.files ?? [])])
          e.target.value = ""
        }}
      />
    </div>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="kicker px-4 pt-3.5 pb-1.5">{children}</div>
}

function Row({ to, active, title, children }: { to: string; active: boolean; title: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        "block border-t border-[var(--color-surface-2)] px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
        active
          ? "border-l-[3px] border-l-[var(--color-accent)] bg-[var(--color-surface-2)] pl-[13px]"
          : "hover:bg-[var(--color-surface)]",
      )}
    >
      <div className={cn("truncate text-sm", active && "font-bold")}>{title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">{children}</div>
    </Link>
  )
}

const TONE = {
  warn: "bg-[var(--color-warn-tint)] text-[var(--color-warn)]",
  accent: "bg-[var(--color-accent-tint)] text-[var(--color-accent)]",
  danger: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
}

function Pill({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[tone])}>
      {children}
    </span>
  )
}

function StatusPill({ status }: { status: UploadStatus }) {
  if (status === "PROCESSING")
    return (
      <Pill tone="warn">
        <span className="size-2.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        Đang trích…
      </Pill>
    )
  if (status === "READY") return <Pill tone="accent">Chờ duyệt</Pill>
  return <Pill tone="danger">Lỗi</Pill>
}
