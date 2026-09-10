import { cn } from "@/lib/cn"

export type Segment = "done" | "current" | "todo"

const TONE: Record<Segment, string> = {
  done: "bg-[var(--color-success)]",
  current: "bg-[var(--color-accent)]",
  todo: "bg-[var(--color-border)]",
}

/**
 * Thanh tiến độ chia đốt — design dùng ở bước onboarding (màn 2), buổi trong
 * tuần (màn 4), bài trong buổi (màn 5) và bước gửi clip (màn 7).
 */
export function SegmentBar({ segments, className }: { segments: Segment[]; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} aria-hidden="true">
      {segments.map((tone, i) => (
        <span key={i} className={cn("h-1 flex-1 rounded-full", TONE[tone])} />
      ))}
    </div>
  )
}
