import { useState, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { ChevronRight } from "lucide-react-native"
import { colors } from "~/theme"

/** Thẻ gập — bản mobile của Section web (<details>): bấm dòng tiêu đề để mở/đóng. */
export function Section({
  title,
  meta,
  open = false,
  children,
}: {
  title: string
  meta: string
  open?: boolean
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(open)
  return (
    <View className="rounded-lg bg-surface px-3.5">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center gap-2 py-4"
      >
        <Text className="text-[15px] font-bold text-text">{title}</Text>
        <Text className="text-[15px] font-semibold text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          · {meta}
        </Text>
        <View className="ml-auto" style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}>
          <ChevronRight size={18} color={colors["text-muted"]} />
        </View>
      </Pressable>
      {expanded && <View className="pb-3">{children}</View>}
    </View>
  )
}
