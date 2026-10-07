import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"
import { Sheet, SheetHeader, SHEET_FOCUS } from "@/components/ui/sheet"
import { indexAtScroll, nearestIndex } from "@/lib/wheel"

// Chiều cao một ô trong cột, khớp h-11. Cột cao 220 = 5 ô, dải chọn nằm ở ô giữa (88px).
const ITEM = 44

/**
 * Ô trông như input; bấm vào mới mở khung chọn trượt từ đáy lên, kiểu bộ chọn
 * ngày trên điện thoại (doc/design-ui-m2-v1.md). "Xong" mới ghi giá trị, "Huỷ"
 * hay chạm nền tối thì giữ nguyên. Khung là `Sheet` dùng chung.
 */
export function PickerField({
  id,
  title,
  columns,
  columnLabels,
  value,
  start,
  display,
  unit,
  separator,
  onChange,
}: {
  id: string
  title: string
  columns: number[][]
  /** Nhãn đọc màn hình cho từng cột khi có nhiều cột, vd "Cân nặng, phần lẻ". */
  columnLabels?: string[]
  /** null = ô chưa chọn. */
  value: number[] | null
  /** Cột mở ở đâu khi ô còn trống. Chỉ là chỗ bắt đầu cuộn, không tự ghi vào ô. */
  start: number[]
  /** Chữ hiện trong ô khi đã có giá trị. */
  display: string | null
  unit?: string
  separator?: string
  onChange: (value: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<number[]>(start)

  function openSheet() {
    setDraft(value ?? start)
    setOpen(true)
  }

  function done() {
    onChange(draft)
    setOpen(false)
  }

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        // <Label htmlFor> đè tên nút bằng nhãn; ghi rõ cả giá trị để trình đọc màn hình đọc được.
        aria-label={`${title}: ${display ?? "chưa chọn"}`}
        onClick={openSheet}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pr-3 pl-3.5 text-left text-[15px]",
          SHEET_FOCUS,
          display ? "num font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
        )}
      >
        {display ?? "Chọn"}
        <ChevronDown className="size-4.5 text-[var(--color-text-muted)]" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label={title} className="pb-7">
        <SheetHeader title={title} confirmLabel="Xong" onCancel={() => setOpen(false)} onConfirm={done} />
        <div className="relative mx-4 flex h-[220px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-1.5 top-[88px] h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
          />
          {columns.map((values, i) => (
            <Fragment key={i}>
              {i > 0 && separator && (
                <span aria-hidden className="relative grid w-3 place-items-center text-[22px] font-extrabold">
                  {separator}
                </span>
              )}
              <WheelColumn
                label={columnLabels?.[i] ?? title}
                values={values}
                value={draft[i]}
                onChange={(v) => setDraft((d) => d.map((x, j) => (j === i ? v : x)))}
              />
            </Fragment>
          ))}
          {unit && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-[101px] right-4 text-[13px] text-[var(--color-text-muted)]"
            >
              {unit}
            </span>
          )}
        </div>
      </Sheet>
    </>
  )
}

const STEP_KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }

/** Một cột cuộn. Cuộn dừng đúng ô nhờ CSS scroll-snap; JS chỉ đọc ô nào đang ở giữa. */
function WheelColumn({
  label,
  values,
  value,
  onChange,
}: {
  label: string
  values: number[]
  value: number
  onChange: (value: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const index = nearestIndex(values, value)
  // Chỉ lúc mount: về sau vị trí cuộn là nguồn sự thật, không kéo ngược theo state.
  const initialTop = useRef(index * ITEM)

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initialTop.current
  }, [])

  function scrollToIndex(i: number, behavior: ScrollBehavior) {
    const clamped = Math.min(values.length - 1, Math.max(0, i))
    ref.current?.scrollTo({ top: clamped * ITEM, behavior })
  }

  function onScroll() {
    if (!ref.current) return
    const i = indexAtScroll(ref.current.scrollTop, ITEM, values.length)
    if (values[i] !== value) onChange(values[i])
  }

  // Bàn phím cuộn tức thì và tính từ vị trí cuộn thật: bấm ↓ liên tục không mất phím
  // vì không phải chờ state bắt kịp một lần cuộn mượt đang chạy dở.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!ref.current) return
    const from = indexAtScroll(ref.current.scrollTop, ITEM, values.length)
    const target =
      e.key === "Home" ? 0 : e.key === "End" ? values.length - 1 : e.key in STEP_KEYS ? from + STEP_KEYS[e.key] : null
    if (target === null) return
    e.preventDefault()
    scrollToIndex(target, "instant")
  }

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={values[index]}
      aria-valuemin={values[0]}
      aria-valuemax={values[values.length - 1]}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className="relative flex-1 snap-y snap-mandatory overflow-y-auto py-[88px] [mask-image:linear-gradient(180deg,transparent,black_30%,black_70%,transparent)] [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    >
      {values.map((v, i) => (
        <div
          key={v}
          onClick={() => scrollToIndex(i, "smooth")}
          className={cn(
            "num grid h-11 cursor-pointer snap-center place-items-center",
            i === index
              ? "text-[22px] font-extrabold text-[var(--color-text)]"
              : "text-lg text-[var(--color-text-muted)]",
          )}
        >
          {v}
        </div>
      ))}
    </div>
  )
}
