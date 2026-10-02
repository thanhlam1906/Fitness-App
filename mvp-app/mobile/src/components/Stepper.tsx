import { View } from "react-native"
import { Kicker } from "./Kicker"
import { SegmentBar, type Segment } from "./SegmentBar"

/** Luồng tuyến tính: bước trước `current` là done, sau là todo. */
function linearSegments(total: number, current: number): Segment[] {
  return Array.from({ length: total }, (_, i) => (i < current ? "done" : i === current ? "current" : "todo"))
}

/** Nhãn "Bước 4 / 6" cộng thanh chia đốt — §4.3 concept-frontend-v1.md, như Stepper web. */
export function Stepper({ label, steps, current }: { label: string; steps: number; current: number }) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Kicker>{label}</Kicker>
        <Kicker style={{ fontVariant: ["tabular-nums"] }}>
          Bước {current + 1} / {steps}
        </Kicker>
      </View>
      <SegmentBar className="mt-2.5" segments={linearSegments(steps, current)} />
    </View>
  )
}
