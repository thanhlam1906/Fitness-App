import type { ReactNode } from "react"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { cn } from "@/lib/cn"

/**
 * Khung một màn: nền tối, chừa tai thỏ/thanh trạng thái, lề 20px như cột 430px của web.
 * `scroll=false` cho màn tự lo cuộn (danh sách dài, chat).
 */
export function Screen({
  children,
  scroll = true,
  className,
}: {
  children: ReactNode
  scroll?: boolean
  className?: string
}) {
  const insets = useSafeAreaInsets()
  if (!scroll)
    return (
      <View className={cn("flex-1 bg-bg px-5", className)} style={{ paddingTop: insets.top + 16 }}>
        {children}
      </View>
    )
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName={cn("px-5 pb-11", className)}
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}
