import type { ReactNode } from "react"
import Svg, { Circle, Path, Rect } from "react-native-svg"

// Ba thiết bị lucide không có icon. Vẽ tay cùng nét với lucide (24×24, stroke 2, bo tròn) để
// đứng cạnh icon Dumbbell của lucide không lệch — chép từ web/src/features/onboarding/components/icons.tsx.
export type IconProps = { color: string; size?: number }

function Base({ color, size = 22, children }: IconProps & { children: ReactNode }) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  )
}

/** Hai trụ giá, đòn tạ ngang, hai đĩa ở hai đầu. */
export function BarbellRackIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M6 3v18M18 3v18M3 21h6M15 21h6M2 9h20" />
      <Path d="M3 6.5v5M21 6.5v5" />
    </Base>
  )
}

export function KettlebellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="15" r="6" />
      <Path d="M8.6 10.3 8 7a4 4 0 0 1 8 0l-.6 3.3" />
    </Base>
  )
}

/** Ghế phẳng nhìn ngang: mặt ghế và hai chân. */
export function BenchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <Rect x="2" y="8" width="20" height="4" rx="1" />
      <Path d="M6 12v7M18 12v7M4 19h4M16 19h4" />
    </Base>
  )
}
