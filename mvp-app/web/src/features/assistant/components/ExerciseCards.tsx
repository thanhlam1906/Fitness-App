import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { ExerciseGuideBody } from "@/components/ExerciseGuideBody"
import { ExerciseImage } from "@/components/ExerciseImage"
import { cn } from "@/lib/cn"
import { EQUIPMENT_VI } from "@/lib/equipment"
import { MUSCLE_VI } from "@/lib/muscles"
import type { ExerciseCard } from "@/features/assistant/types"

// Hàng gọn nằm trong khung overflow-hidden nên viền focus vẽ vào trong, vẽ ra ngoài sẽ bị cắt.
const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const FRAME = "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"

/**
 * Thẻ bài dưới câu trả lời của trợ lý, theo mockup doc/mockup-thu-vien-bai/demo.html
 * (doc/design-thu-vien-bai-v1.md §7.3). Một bài: thẻ đầy đủ. Hai, ba bài: hàng gọn, bấm mở thẻ.
 * Nội dung lấy thẳng từ DB qua backend, nên vẫn nằm dưới nút "cái này sai" của tin nhắn.
 */
export function ExerciseCards({ cards }: { cards?: ExerciseCard[] }) {
  if (!cards?.length) return null
  if (cards.length === 1) {
    const [c] = cards
    return (
      <div className={cn("mt-2.5", FRAME)}>
        <ExerciseGuideBody {...bodyProps(c)} title={c.nameEn} inCard />
      </div>
    )
  }
  return <ExerciseRows cards={cards} />
}

function ExerciseRows({ cards }: { cards: ExerciseCard[] }) {
  // Một lúc mở một hàng: thẻ dài, mở cả ba thì đẩy cuộc trò chuyện đi quá xa. Bài đầu mở sẵn.
  const [openSlug, setOpenSlug] = useState<string | null>(cards[0].slug)
  return (
    <div className="mt-2.5 flex flex-col gap-2">
      {cards.map((c) => {
        const open = c.slug === openSlug
        return (
          <div key={c.slug} className={FRAME}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenSlug(open ? null : c.slug)}
              className={cn("flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] py-2 pr-3 pl-2 text-left", FOCUS)}
            >
              <ExerciseImage slug={c.slug} alt="" variant="thumb" inCard />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm font-bold">{c.nameEn}</b>
                <small className="block truncate text-xs text-[var(--color-text-muted)]">{summary(c)}</small>
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-[18px] flex-none text-[var(--color-text-muted)] transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </button>
            {/* Chỉ dựng thân khi mở: không tải ảnh động của hàng đang đóng. Tên đã ở nút nên không truyền `title`. */}
            {open && (
              <div className="border-t border-[var(--color-border)]">
                <ExerciseGuideBody {...bodyProps(c)} inCard />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function bodyProps(c: ExerciseCard) {
  return {
    slug: c.slug,
    muscleGroups: c.muscleGroups,
    equipment: c.equipment,
    stepsVi: c.stepsVi,
    mistakesVi: c.mistakesVi,
  }
}

/** "Cơ chính · dụng cụ" của hàng gọn. Bài không cần dụng cụ ghi "Không cần" như trong thân thẻ. */
function summary(c: ExerciseCard): string {
  const main = c.muscleGroups[0]
  const equipment = c.equipment.length > 0 ? c.equipment.map((code) => EQUIPMENT_VI[code] ?? code).join(", ") : "Không cần"
  return [main && (MUSCLE_VI[main] ?? main), equipment].filter(Boolean).join(" · ")
}
