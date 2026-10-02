import { cn } from "@/lib/cn"

export type ChunkItem = { key: string; number: number; heading: string; content: string; flagged?: boolean }

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
