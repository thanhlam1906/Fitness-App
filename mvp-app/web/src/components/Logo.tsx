import { cn } from "@/lib/cn"

/** Chữ V vẽ như dấu tích: vừa "Việt", vừa "form chuẩn" — hai thứ app hứa. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-[30px]" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
        <path
          d="M8.5 11 L14.2 22 L23.5 8.5"
          fill="none"
          stroke="var(--color-accent-fg)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[21px] font-extrabold tracking-[-0.02em]">VFit</span>
    </span>
  )
}
