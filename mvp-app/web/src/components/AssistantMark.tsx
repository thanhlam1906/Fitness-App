/** Bong bóng chat ôm chữ V tích của logo: trợ lý là một phần của VFit, không phải robot dán vào. */
const BUBBLE = "M7 3h18a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-9l-6 5v-5H7a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z"
const CHECK = "M10 10.5l4.3 8.2 7.2-10.2"

/** Biểu tượng đặc màu nhấn — đầu màn trợ lý và cạnh mỗi câu trả lời. */
export function AssistantMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0" aria-hidden>
      <path d={BUBBLE} fill="var(--color-accent)" />
      <path
        d={CHECK}
        fill="none"
        stroke="var(--color-accent-fg)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Bản nét theo currentColor cho thanh tab, để đổi màu theo tab đang chọn như các icon khác. */
export function AssistantTabIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={BUBBLE} />
      <path d={CHECK} />
    </svg>
  )
}
