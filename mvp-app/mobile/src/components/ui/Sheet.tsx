import type { ReactNode } from "react"
import { Modal, Pressable, Text, View } from "react-native"
import Animated, { SlideInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { cn } from "@/lib/cn"

/**
 * Khung trượt từ đáy lên — bản mobile của Sheet web (<dialog>). Nền tối hiện dần, khung trượt lên;
 * bấm nền tối hoặc vuốt "back" thì đóng, trừ khi `dismissible=false` (đang lưu nhiều bước).
 * Nội dung chỉ dựng khi mở, như web: cột cuộn của Picker đo vị trí lúc dựng.
 */
export function Sheet({
  open,
  onClose,
  label,
  className,
  dismissible = true,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  dismissible?: boolean
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => dismissible && onClose()}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Đóng"
          className="absolute inset-0 bg-bg/70"
          onPress={() => dismissible && onClose()}
        />
        <Animated.View
          entering={SlideInDown.duration(200)}
          accessibilityViewIsModal
          aria-label={label}
          className={cn("max-h-[88%] rounded-t-[20px] border-t border-border bg-surface pt-2.5", className)}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-border" />
          {open && children}
        </Animated.View>
      </View>
    </Modal>
  )
}

/** Hàng đầu khung kiểu iOS: "Huỷ" · tiêu đề · nút xác nhận (người dùng chốt giữ kiểu này, 09-26). */
export function SheetHeader({
  title,
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  title: string
  confirmLabel?: string
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm?: () => void
}) {
  return (
    <View className="flex-row items-center justify-between px-3 pb-2">
      <Pressable accessibilityRole="button" onPress={onCancel} className="p-2">
        <Text className="font-semibold text-text-muted">{onConfirm ? "Huỷ" : "Đóng"}</Text>
      </Pressable>
      <Text className="flex-1 text-center font-bold text-text" numberOfLines={1}>
        {title}
      </Text>
      {onConfirm ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!confirmDisabled }}
          disabled={confirmDisabled}
          onPress={onConfirm}
          className={cn("p-2", confirmDisabled && "opacity-40")}
        >
          <Text className="font-extrabold text-accent">{confirmLabel}</Text>
        </Pressable>
      ) : (
        // Giữ tiêu đề ở giữa khi không có nút xác nhận.
        <View className="w-12" />
      )}
    </View>
  )
}
