import { View } from "react-native"
import { cn } from "@/lib/cn"

export type Segment = "done" | "current" | "todo"

const TONE: Record<Segment, string> = {
  done: "bg-success",
  current: "bg-accent",
  todo: "bg-border",
}

/** Thanh tiến độ chia đốt — bước onboarding, buổi trong tuần, bài trong buổi (như web). */
export function SegmentBar({ segments, className }: { segments: Segment[]; className?: string }) {
  return (
    <View className={cn("flex-row gap-1", className)} importantForAccessibility="no-hide-descendants">
      {segments.map((tone, i) => (
        <View key={i} className={cn("h-1 flex-1 rounded-full", TONE[tone])} />
      ))}
    </View>
  )
}
