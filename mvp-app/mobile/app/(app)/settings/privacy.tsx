import { useSyncExternalStore, type ComponentType, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useIsMutating } from "@tanstack/react-query"
import { Camera, MessageCircle, Trash2 } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { useAuth } from "~/features/auth/components/AuthContext"
import { clearConversation, getConversation, subscribe } from "~/features/assistant/utils/conversation"
import { ASK_KEY } from "~/features/assistant/api/useAssistant"
import { SettingsSubLayout } from "~/features/profile/components/SettingsSubLayout"
import { colors } from "~/theme"

/**
 * Cài đặt › Dữ liệu & quyền riêng tư — bản mobile của PrivacyPage web. Chỉ nói điều app THẬT SỰ làm.
 * Máy chủ vẫn lưu câu hỏi/trả lời trợ lý — ghi rõ, để nút xoá không bị hiểu là xoá cả trên máy chủ
 * (quyết định 09-29).
 */
export default function PrivacyScreen() {
  const { userId } = useAuth()
  const conversation = useSyncExternalStore(subscribe, () => getConversation(userId ?? ""))
  const count = conversation.messages.length
  // Câu trả lời đang chờ sẽ ghi lại vào cuộc trò chuyện vừa xoá (mutation chạy tiếp dù đã rời màn
  // trợ lý) — chờ nó xong mới cho xoá, như nút "Trò chuyện mới" (code-reviewer 09-29 #2).
  const answering = useIsMutating({ mutationKey: ASK_KEY }) > 0
  const disabled = count === 0 || !userId || answering

  return (
    <SettingsSubLayout title="Dữ liệu & quyền riêng tư">
      <View className="mt-4 gap-2.5">
        {/* Khác web: mobile không có màn camera nhận dạng trên máy, chấm form là gửi video quay sẵn. */}
        <Card Icon={Camera} title="Chấm form">
          Video chỉ gửi đi khi bạn <Text className="font-semibold text-text">tích đồng ý</Text> ở màn quay video. Máy
          phân tích, không ai xem video.
        </Card>
        <Card Icon={Trash2} title="Video bạn gửi">
          Video bị <Text className="font-semibold text-text">xoá ngay sau khi chấm</Text>, kể cả khi chấm lỗi. Không ai
          tải lại được, kể cả quản trị viên.
        </Card>
        <Card
          Icon={MessageCircle}
          title="Trợ lý"
          footer={
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => userId && clearConversation(userId)}
              className={cn("mt-3 h-11 items-center justify-center rounded-md border border-danger/40 bg-danger-tint", disabled && "opacity-40")}
            >
              <Text className="text-sm font-bold text-danger">
                Xoá cuộc trò chuyện trên máy{count > 0 && ` (${count} tin)`}
              </Text>
            </Pressable>
          }
          note={
            // Nhãn nút giữ tên việc; lý do không bấm được nằm dưới nút.
            (count === 0 || answering) && (
              <Text className="mt-1.5 text-xs text-text-muted">
                {count === 0 ? "Chưa có cuộc trò chuyện nào trên máy." : "Trợ lý đang trả lời, xoá được khi trả lời xong."}
              </Text>
            )
          }
        >
          Cuộc trò chuyện hiện tại lưu <Text className="font-semibold text-text">trên máy này</Text> để bạn chuyển màn
          không bị mất. Máy chủ vẫn lưu câu hỏi và trả lời để cải thiện trợ lý.
        </Card>
      </View>
    </SettingsSubLayout>
  )
}

function Card({
  Icon,
  title,
  footer,
  note,
  children,
}: {
  Icon: ComponentType<{ color: string; size?: number }>
  title: string
  footer?: ReactNode
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <View className="rounded-md border border-border bg-surface p-3.5">
      <View className="flex-row items-center gap-2">
        <Icon size={18} color={colors.accent} />
        <Text className="text-[15px] font-bold text-text">{title}</Text>
      </View>
      <Text className="mt-1.5 text-[13px] leading-5 text-text-muted">{children}</Text>
      {footer}
      {note}
    </View>
  )
}
