import { cn } from "@/lib/cn"
import { Skeleton } from "@/components/ui/skeleton"

export type ChunkItem = { key: string; number: number; heading: string; content: string; flagged?: boolean }

/** Khung chung của cột phải Kho kiến thức khi đang tải: kicker, tên, dòng phụ, nút, rồi các đoạn. */
export function CorpusDetailSkeleton() {
  return (
    <div role="status" aria-label="Đang tải">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-72" />
      <Skeleton className="mt-2 h-4 w-52" />
      <Skeleton className="mt-4 h-8 w-36" />
      <Skeleton className="mt-6.5 h-4 w-48" />
      <div className="mt-2.5 space-y-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  )
}

/** Đúng các đoạn trợ lý đọc, đánh số từ 1. Đoạn đã dùng trong câu trả lời bị báo sai thì viền đỏ. */
export function ChunkList({ chunks }: { chunks: ChunkItem[] }) {
  return (
    <div className="mt-2.5 space-y-2.5">
      {chunks.map((c) => (
        <div
          key={c.key}
          id={`chunk-${c.number}`}
          className={cn(
            "rounded-[var(--radius-lg)] border bg-[var(--color-surface)] px-3.5 py-3",
            c.flagged ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
          )}
        >
          <div className="flex items-baseline gap-2.5 text-[13px] font-bold">
            <span className="num flex-none text-[var(--color-text-muted)]">#{c.number}</span>
            {c.heading}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-[var(--color-text)]">
            {c.content}
          </p>
        </div>
      ))}
    </div>
  )
}
