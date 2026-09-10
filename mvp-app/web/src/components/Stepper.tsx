import { SegmentBar, type Segment } from "./SegmentBar"

/** Luồng tuyến tính: bước trước `current` là done, sau là todo. */
function linearSegments(total: number, current: number): Segment[] {
  return Array.from({ length: total }, (_, i) =>
    i < current ? "done" : i === current ? "current" : "todo",
  )
}

/**
 * Onboarding (màn 2) và luồng gửi clip (màn 7→8→9). §4.3 concept-frontend-v1.md.
 *
 * Design thay dãy nút số bằng nhãn "Bước 4 / 6" cộng thanh chia đốt: đọc được
 * tiến độ mà không chiếm chiều ngang của màn điện thoại.
 */
export function Stepper({
  label,
  steps,
  current,
}: {
  label: string
  steps: number
  current: number
}) {
  return (
    <div>
      <div className="kicker flex items-center justify-between">
        <span>{label}</span>
        <span className="num">
          Bước {current + 1} / {steps}
        </span>
      </div>
      <SegmentBar className="mt-2.5" segments={linearSegments(steps, current)} />
    </div>
  )
}
