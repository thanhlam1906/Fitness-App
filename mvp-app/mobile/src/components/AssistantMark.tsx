import type { ColorValue } from "react-native"
import Svg, { Path } from "react-native-svg"
import { colors } from "~/theme"

// Cùng hình với web/src/components/AssistantMark.tsx: bong bóng chat ôm chữ V tích của logo.
const BUBBLE = "M7 3h18a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-9l-6 5v-5H7a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z"
const CHECK = "M10 10.5l4.3 8.2 7.2-10.2"

/** Biểu tượng đặc màu nhấn — đầu màn trợ lý và cạnh mỗi câu trả lời. */
export function AssistantMark({ size = 28 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 32 32" width={size} height={size} style={{ flexShrink: 0 }}>
      <Path d={BUBBLE} fill={colors.accent} />
      <Path
        d={CHECK}
        fill="none"
        stroke={colors["accent-fg"]}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Bản nét cho thanh tab, nhận màu của tab đang chọn như các icon khác. */
export function AssistantTabIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <Svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d={BUBBLE} />
      <Path d={CHECK} />
    </Svg>
  )
}
