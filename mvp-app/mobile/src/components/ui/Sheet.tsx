import type { ReactNode } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native"
import Animated, { Keyframe } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { cn } from "@/lib/cn"

// Không dùng SlideInDown: nó chạy trên originY tính theo cửa sổ, trong Modal statusBarTranslucent của Android
// khung dừng lệch lên đúng chiều cao thanh trạng thái, chừa dải hở ở đáy. translateY không phụ thuộc vị trí đó.
const truotLen = new Keyframe({
  0: { transform: [{ translateY: 800 }] },
  100: { transform: [{ translateY: 0 }] },
}).duration(200)

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
  onBack,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  dismissible?: boolean
  /** Đang ở trang con trong khung: nút back Android quay về trang trước thay vì đóng khung. */
  onBack?: () => void
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => (onBack ? onBack() : dismissible && onClose())}
      statusBarTranslucent
    >
      {/* Modal là cây riêng, KeyboardAvoidingView của Screen không tới đây: ô tìm bài tự focus trong khung
          thì bàn phím che mất danh sách kết quả. */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="Đóng"
          className="absolute inset-0 bg-bg/70"
          onPress={() => dismissible && onClose()}
        />
        <Animated.View
          entering={truotLen}
          accessibilityViewIsModal
          aria-label={label}
          className={cn("max-h-[88%] rounded-t-[20px] border-t border-border bg-surface pt-2.5", className)}
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-border" />
          {open && children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** Hàng đầu khung kiểu iOS: "Huỷ" · tiêu đề · nút xác nhận (người dùng chốt giữ kiểu này, 09-26). */
export function SheetHeader({
  title,
  cancelLabel,
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  title: string
  /** Mặc định "Huỷ" khi có nút xác nhận, "Đóng" khi không. Trang con trong khung ghi "Quay lại". */
  cancelLabel?: string
  confirmLabel?: string
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm?: () => void
}) {
  return (
    <View className="flex-row items-center justify-between px-3 pb-2">
      <Pressable accessibilityRole="button" onPress={onCancel} className="p-2">
        <Text className="font-semibold text-text-muted">{cancelLabel ?? (onConfirm ? "Huỷ" : "Đóng")}</Text>
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
