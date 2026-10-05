import { useState } from "react"
import { cn } from "@/lib/cn"
import { HELP, type HelpKey } from "@/features/admin/utils/formCheckHelp"

/** Hướng dẫn ẩn mặc định: bấm "?" để mở, bấm lại để ẩn; mở nhiều cái cùng lúc được. */
export function useHelp() {
  const [open, setOpen] = useState<ReadonlySet<HelpKey>>(new Set())
  return {
    isOpen: (key: HelpKey) => open.has(key),
    toggle: (key: HelpKey) =>
      setOpen((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
  }
}

export function HelpButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}
      className={cn(
        "ml-1.5 inline-grid size-5 flex-none place-items-center rounded-full border text-xs leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        open
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      ?
    </button>
  )
}

export function HelpText({ id, className }: { id: HelpKey; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-[3px] border-[var(--color-accent)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] leading-relaxed",
        className,
      )}
    >
      {HELP[id].map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
