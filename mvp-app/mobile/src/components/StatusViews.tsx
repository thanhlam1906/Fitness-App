import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { CircleAlert, type LucideIcon } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/*
 * Bản mobile của web/src/components/StatusViews.tsx: trạng thái vẽ bằng biểu tượng thay vì chỉ một
 * dòng chữ (doc/mockup-bieu-tuong, người dùng duyệt 10-09). Lý do lỗi cụ thể vẫn là chữ.
 * Icon lucide-react-native nhận màu qua prop `color`, không theo màu chữ như web, nên mỗi tone giữ
 * cả class nền lẫn mã màu.
 */
const TONE = {
  muted: { box: "bg-surface-2", color: colors["text-muted"] },
  accent: { box: "bg-accent-tint", color: colors.accent },
  success: { box: "bg-success-tint", color: colors.success },
  warn: { box: "bg-warn-tint", color: colors.warn },
  danger: { box: "bg-danger-tint", color: colors.danger },
}
const TEXT = { muted: "text-text-muted", warn: "text-warn", danger: "text-danger" }
export type Tone = keyof typeof TONE

/** Biểu tượng trong vòng tròn nền nhạt. Mặc định 60px, icon 28px như web. */
export function IconCircle({
  icon: Icon,
  tone = "muted",
  size = 60,
  iconSize = 28,
  className,
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: number
  iconSize?: number
  className?: string
  children?: ReactNode
}) {
  return (
    <View
      className={cn("items-center justify-center overflow-hidden rounded-full", TONE[tone].box, className)}
      style={{ width: size, height: size }}
    >
      {children}
      <Icon size={iconSize} color={TONE[tone].color} strokeWidth={1.8} />
    </View>
  )
}

/** Cả khối chưa có gì hoặc tải hỏng: biểu tượng, tiêu đề ngắn, dòng lý do, nút đi tiếp. */
export function StatusBlock({
  icon,
  tone = "muted",
  title,
  detail,
  className,
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  title: string
  detail?: string | null
  className?: string
  children?: ReactNode
}) {
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      className={cn("items-center rounded-2xl bg-surface px-5 py-7", className)}
    >
      <IconCircle icon={icon} tone={tone} />
      <Text className="mt-3.5 text-center text-[17px] font-bold text-text">{title}</Text>
      {!!detail && <Text className="mt-1 max-w-[300px] text-center text-[13px] text-text-muted">{detail}</Text>}
      {children && <View className="mt-4 flex-row flex-wrap justify-center gap-2">{children}</View>}
    </View>
  )
}

/** Câu ngắn có biểu tượng đứng trước: lỗi sau khi bấm (mặc định, đỏ) hoặc trống nhỏ trong thẻ (`tone="muted"`). */
export function IconText({
  icon: Icon = CircleAlert,
  tone = "danger",
  small = false,
  className,
  children,
}: {
  icon?: LucideIcon
  tone?: keyof typeof TEXT
  /** Chữ 12px thay vì 14px — chỗ web dùng `text-xs`. */
  small?: boolean
  className?: string
  children: ReactNode
}) {
  const color = tone === "muted" ? colors["text-muted"] : colors[tone]
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      className={cn("flex-row items-start gap-2", className)}
    >
      <Icon size={small ? 14 : 16} color={color} style={{ marginTop: small ? 2 : 3 }} />
      <Text className={cn("min-w-0 shrink", small ? "text-xs" : "text-sm", TEXT[tone])}>{children}</Text>
    </View>
  )
}

/** Dải nhắc có nền màu khi việc đang làm bị chặn (bài chưa chấm được, thiếu góc quay). */
export function Notice({
  icon: Icon,
  tone,
  alert,
  className,
  textClassName,
  children,
}: {
  icon: LucideIcon
  tone: "warn" | "danger"
  alert?: boolean
  className?: string
  textClassName?: string
  children: ReactNode
}) {
  return (
    <View
      accessibilityRole={alert ? "alert" : undefined}
      className={cn("flex-row items-start gap-2.5 rounded-md px-3 py-2.5", TONE[tone].box, className)}
    >
      <Icon size={16} color={TONE[tone].color} style={{ marginTop: 2 }} />
      <Text className={cn("min-w-0 shrink text-[13px]", TEXT[tone], textClassName)}>{children}</Text>
    </View>
  )
}
