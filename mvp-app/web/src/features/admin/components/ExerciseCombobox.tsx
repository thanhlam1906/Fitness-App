import { useId, useMemo, useRef, useState, type Ref } from "react"
import { cn } from "@/lib/cn"
import { EQUIPMENT_VI } from "@/lib/equipment"
import { filterExercises } from "@/lib/exerciseFilter"
import { MUSCLE_VI } from "@/lib/muscles"
import type { Exercise } from "@/features/exercise/types"

const SHOWN = 8

/**
 * Ô "Bài" của template: gõ tên rồi chọn trong gợi ý, thay ô chọn xổ ra cả thư viện 1.328 bài
 * (mockup doc/mockup-tim-bai). Mẫu combobox ARIA: focus ở ô gõ, aria-activedescendant chỉ dòng đang sáng.
 * catalog là MỌI bài: bài đã tắt vẫn hiện tên ở dòng đang dùng nó, chỉ không có trong gợi ý chọn mới.
 */
export function ExerciseCombobox({
  catalog,
  value,
  onChange,
  onBlur,
  inputRef,
  label,
  invalid = false,
  className,
}: {
  catalog: Exercise[]
  value: string
  onChange: (slug: string) => void
  onBlur?: () => void
  /** react-hook-form đưa focus tới ô lỗi khi bấm Lưu (shouldFocusError). */
  inputRef?: Ref<HTMLInputElement>
  label: string
  invalid?: boolean
  className?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const own = useRef<HTMLInputElement | null>(null)

  const chosen = catalog.find((e) => e.slug === value)
  const shownName = chosen ? `${chosen.nameEn}${chosen.active ? "" : " (đã tắt)"}` : ""
  // Template có vài chục dòng, mỗi phím gõ ở ô Set/Rep render lại mọi dòng: sort 1.328 bài một lần theo catalog,
  // và chỉ lọc khi ô đang mở.
  const choices = useMemo(
    () => catalog.filter((e) => e.active).sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
    [catalog],
  )
  const matches = useMemo(() => (open ? filterExercises(choices, query, null) : []), [open, choices, query])
  const options = matches.slice(0, SHOWN)

  function openEmpty() {
    setOpen(true)
    setQuery("")
    setActive(0)
  }

  function close() {
    // Gõ dở mà không chọn thì ô trở về bài cũ: chữ đang gõ không phải là một bài.
    setOpen(false)
    setQuery("")
  }

  function pick(e: Exercise) {
    onChange(e.slug)
    close()
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault()
      if (!open) {
        openEmpty()
        return
      }
      const step = ev.key === "ArrowDown" ? 1 : -1
      setActive((i) => (options.length === 0 ? 0 : (i + step + options.length) % options.length))
    } else if (ev.key === "Enter") {
      // Ô chọn bài không phải chỗ bấm Lưu: Enter không bao giờ gửi form, kể cả khi gợi ý đã đóng.
      ev.preventDefault()
      // Chưa gõ gì thì dòng đang sáng chỉ là bài đầu bảng chữ cái, không phải lựa chọn: giữ bài cũ.
      if (open && query.trim() && options[active]) pick(options[active])
      else if (open) close()
    } else if (ev.key === "Escape" && open) {
      ev.preventDefault()
      close()
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={(el) => {
          own.current = el
          if (typeof inputRef === "function") inputRef(el)
          else if (inputRef) inputRef.current = el
        }}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Gõ tên bài…"
        value={open ? query : shownName}
        onFocus={openEmpty}
        // Chọn xong ô vẫn focus nên bấm lại không bắn onFocus: mở lại với ô trống, không nối chữ vào tên cũ.
        onClick={() => {
          if (!open) openEmpty()
        }}
        onChange={(ev) => {
          // Gõ khi gợi ý đã đóng (vừa chọn bằng Enter, ô vẫn focus): chữ trong ô là tên bài cũ, chỉ lấy phần mới gõ.
          // Bôi đen cả tên (Ctrl+A) rồi gõ đè thì chữ trong ô không còn bắt đầu bằng tên cũ: lấy nguyên.
          const raw = ev.target.value
          const typed = !open && shownName && raw.startsWith(shownName) ? raw.slice(shownName.length) : raw
          setQuery(typed)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          close()
          onBlur?.()
        }}
        className={cn(
          "h-[34px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm outline-none focus:border-[var(--color-accent)]",
          invalid && "border-[var(--color-danger)]",
        )}
      />
      {open && (
        <div
          // mousedown chạy trước blur của ô gõ: chặn để ô không đóng trước khi kịp nhận cú bấm (cả phần đệm, dòng đếm).
          onMouseDown={(ev) => ev.preventDefault()}
          className="absolute top-[38px] left-0 z-20 w-full min-w-[380px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 shadow-xl"
        >
          <ul id={listId} role="listbox" aria-label={`Gợi ý cho ${label.toLowerCase()}`}>
            {options.map((e, i) => (
              <li
                key={e.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(e)}
                className={cn(
                  "flex cursor-pointer items-baseline justify-between gap-2.5 rounded-md px-2 py-1.5 text-meta",
                  i === active && "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
                )}
              >
                <span className="truncate">{e.nameEn}</span>
                <small className={cn("flex-none text-2xs", i === active ? "opacity-75" : "text-[var(--color-text-muted)]")}>
                  {meta(e)}
                </small>
              </li>
            ))}
          </ul>
          {/* listbox chỉ chứa option: câu báo đứng ngoài, role status để trình đọc màn hình đọc khi số kết quả đổi. */}
          <p
            role="status"
            className={cn(
              "px-2 text-2xs text-[var(--color-text-muted)] empty:hidden",
              options.length > 0 && "mt-0.5 border-t border-[var(--color-border)] pt-1.5 pb-1",
              options.length === 0 && "py-2 text-meta",
            )}
          >
            {options.length === 0
              ? "Không có bài nào khớp."
              : matches.length > SHOWN
                ? `Còn ${(matches.length - SHOWN).toLocaleString("vi-VN")} bài khớp, gõ thêm để thu hẹp`
                : ""}
          </p>
        </div>
      )}
    </div>
  )
}

/** Nhóm cơ chính · dụng cụ chính: phân biệt các bài cùng tên khác dụng cụ (squat tạ đòn với squat tạ đơn). */
function meta(e: Exercise): string {
  const muscle = MUSCLE_VI[e.muscleGroups[0]] ?? ""
  const gear = e.equipment.length > 0 ? (EQUIPMENT_VI[e.equipment[0]] ?? e.equipment[0]) : "Không dụng cụ"
  return muscle ? `${muscle} · ${gear}` : gear
}
