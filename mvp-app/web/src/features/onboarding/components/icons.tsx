// Ba thiết bị lucide không có icon. Vẽ tay cùng nét với lucide (24×24, stroke 2, bo tròn)
// để đứng cạnh icon Dumbbell của lucide không lệch.

type IconProps = { className?: string }

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Hai trụ giá, đòn tạ ngang, hai đĩa ở hai đầu. */
export function BarbellRackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v18M18 3v18M3 21h6M15 21h6M2 9h20" />
      <path d="M3 6.5v5M21 6.5v5" />
    </Svg>
  )
}

export function KettlebellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="15" r="6" />
      <path d="M8.6 10.3 8 7a4 4 0 0 1 8 0l-.6 3.3" />
    </Svg>
  )
}

/** Ghế phẳng nhìn ngang: mặt ghế và hai chân. */
export function BenchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="8" width="20" height="4" rx="1" />
      <path d="M6 12v7M18 12v7M4 19h4M16 19h4" />
    </Svg>
  )
}
