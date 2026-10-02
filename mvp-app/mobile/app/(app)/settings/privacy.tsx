import { useSyncExternalStore, type ComponentType, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useIsMutating } from "@tanstack/react-query"
import { Camera, MessageCircle, Trash2 } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { useAuth } from "~/auth/AuthContext"
import { clearConversation, getConversation, subscribe } from "~/features/assistant/conversation"
import { ASK_KEY } from "~/features/assistant/useAssistant"
import { SettingsSubPage } from "~/features/profile/SettingsSubPage"
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
    <SettingsSubPage title="Dữ liệu & quyền riêng tư">
      <View className="mt-4 gap-2.5">
        <Card Icon={Camera} title="Camera chấm form">
          Chỉ gửi <Text className="font-semibold text-text">toạ độ các khớp</Text>, không gửi hình hay video của bạn.
        </Card>
        <Card Icon={Trash2} title="Clip bạn gửi">
          Clip bị <Text className="font-semibold text-text">xoá ngay sau khi chấm</Text>, kể cả khi chấm lỗi. Không ai
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
                {count === 0
                  ? "Không có cuộc trò chuyện nào trên máy"
                  : answering
                    ? "Trợ lý đang trả lời, chờ chút rồi xoá"
                    : `Xoá cuộc trò chuyện trên máy (${count} tin)`}
              </Text>
            </Pressable>
          }
        >
          Cuộc trò chuyện hiện tại lưu <Text className="font-semibold text-text">trên máy này</Text> để bạn chuyển màn
          không bị mất. Máy chủ vẫn lưu câu hỏi và trả lời để cải thiện trợ lý.
        </Card>
      </View>
    </SettingsSubPage>
  )
}

function Card({
  Icon,
  title,
  footer,
  children,
}: {
  Icon: ComponentType<{ color: string; size?: number }>
  title: string
  footer?: ReactNode
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
    </View>
  )
}
