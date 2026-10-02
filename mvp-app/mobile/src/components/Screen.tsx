import type { ReactNode } from "react"
import { KeyboardAvoidingView, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { cn } from "@/lib/cn"

/**
 * Khung một màn: nền tối, chừa tai thỏ/thanh trạng thái, lề 20px như cột 430px của web.
 * Nội dung giãn hết chiều cao (flexGrow) để màn luồng đẩy nút hành động xuống đáy bằng `mt-auto`,
 * như FlowScreen của web. `background` vẽ sau nội dung (ảnh đầu màn). `scroll=false` cho màn tự
 * lo cuộn (danh sách dài, chat).
 */
export function Screen({
  children,
  scroll = true,
  background,
  className,
}: {
  children: ReactNode
  scroll?: boolean
  background?: ReactNode
  className?: string
}) {
  const insets = useSafeAreaInsets()
  const padding = { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-bg">
      {background}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn("px-5", className)}
          contentContainerStyle={[{ flexGrow: 1 }, padding]}
          keyboardShouldPersistTaps="handled"
          // Kéo màn là ẩn bàn phím số (màn buổi tập, mức tạ): iOS không có nút ẩn trên bàn phím số.
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn("flex-1 px-5", className)} style={padding}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  )
}
