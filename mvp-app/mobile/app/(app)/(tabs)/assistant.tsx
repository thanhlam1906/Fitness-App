import { useRef, useState, useSyncExternalStore } from "react"
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIsMutating } from "@tanstack/react-query"
import { MessageCircleWarning, SendHorizontal, SquarePen } from "lucide-react-native"
import type { ChatMessage } from "@/features/assistant/types"
import { cn } from "@/lib/cn"
import { useAuth } from "~/features/auth/components/AuthContext"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { clearConversation, getConversation, subscribe } from "~/features/assistant/utils/conversation"
import { ASK_KEY, useAssistant } from "~/features/assistant/api/useAssistant"
import { colors } from "~/theme"

/**
 * Màn trợ lý — concept-chatbot-v1.md §12, bản mobile của AssistantPage web. Cuộc trò chuyện lưu
 * trên máy (quyết định 09-29). Không SSE (NumberGuard cần câu trả lời đầy đủ mới quyết giữ hay bỏ)
 * nên có "Đang trả lời…" thay vì chữ chạy dần.
 *
 * Không dùng Screen chung: ô nhập phải dính ngay trên bàn phím và thanh tab, danh sách tin tự cuộn.
 */
export default function AssistantScreen() {
  const insets = useSafeAreaInsets()
  const { userId } = useAuth()
  const conversation = useSyncExternalStore(subscribe, () => getConversation(userId!))
  const [input, setInput] = useState("")
  const ask = useAssistant()
  // Không dùng ask.isPending: nó chỉ biết mutation của lần dựng màn này, nên chuyển tab rồi quay lại
  // lúc câu cũ chưa có trả lời sẽ đọc sai thành "rảnh" (code-reviewer 09-29 #2).
  const pending = useIsMutating({ mutationKey: ASK_KEY }) > 0
  const list = useRef<ScrollView>(null)

  function send() {
    const question = input.trim()
    if (!question || pending || !userId) return
    setInput("")
    ask.mutate({ userId, question, threadId: conversation.threadId })
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-bg">
      <View className="flex-1 px-5 pb-3" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-[30px] font-extrabold tracking-[-0.6px] text-text">Trợ lý</Text>
            <Text className="mt-1 text-sm text-text-muted">
              Hỏi về nguyên lý tập luyện, lịch tuần, hay tiến bộ của bạn. Không thay được bác sĩ hay HLV.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cuộc trò chuyện mới"
            accessibilityState={{ disabled: conversation.messages.length === 0 || pending }}
            disabled={conversation.messages.length === 0 || pending}
            onPress={() => userId && clearConversation(userId)}
            className={cn(
              "flex-row items-center gap-1.5 rounded-sm px-2.5 py-2",
              (conversation.messages.length === 0 || pending) && "opacity-40",
            )}
          >
            <SquarePen size={14} color={colors["text-muted"]} />
            <Text className="text-xs font-semibold text-text-muted">Trò chuyện mới</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={list}
          className="mt-4 flex-1"
          contentContainerClassName="gap-3 pb-2"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Tin mới hay "Đang trả lời…" làm nội dung dài ra: cuộn xuống cuối như web scrollIntoView.
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        >
          {conversation.messages.length === 0 && (
            <Text className="py-8 text-center text-sm text-text-muted">
              Thử hỏi: "RPE là gì?" hoặc "tuần này tôi tập gì?"
            </Text>
          )}
          {conversation.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {pending && (
            <View className="flex-row justify-start">
              <View className="rounded-md bg-surface px-4 py-3">
                <Text className="text-sm text-text-muted">Đang trả lời…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="mt-3 flex-row items-center gap-2">
          <Input
            accessibilityLabel="Câu hỏi"
            placeholder="Hỏi trợ lý…"
            className="flex-1"
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={send}
            submitBehavior="submit"
          />
          <Button
            size="sm"
            className="min-h-12 px-3.5"
            onPress={send}
            disabled={!input.trim() || pending}
            accessibilityLabel="Gửi"
          >
            <SendHorizontal size={16} color={colors["accent-fg"]} />
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER"
  return (
    <View className={cn("flex-row", isUser ? "justify-end" : "justify-start")}>
      <View
        className={cn(
          "max-w-[85%] rounded-md px-4 py-3",
          isUser && "bg-accent",
          !isUser && !message.blocked && "bg-surface",
          !isUser && message.blocked && "bg-danger-tint",
        )}
      >
        {!isUser && message.blocked && (
          <View className="mb-1.5 flex-row items-center gap-1.5">
            <MessageCircleWarning size={14} color={colors.danger} />
            <Text className="text-xs font-semibold text-danger">Ngoài phạm vi trợ lý</Text>
          </View>
        )}
        <Text selectable className={cn("text-[15px] leading-[24px]", isUser ? "text-accent-fg" : "text-text")}>
          {message.text}
        </Text>
        {!!message.sourceTitles?.length && (
          <Text className="mt-2 text-xs text-text-muted">Nguồn: {message.sourceTitles.join(", ")}</Text>
        )}
        {/* Bất biến: mọi góp ý do máy sinh ra có nút "cái này sai". */}
        {!isUser && message.messageId && (
          <View className="mt-2">
            <WrongFeedbackButton source={{ assistantMessageId: message.messageId }} />
          </View>
        )}
      </View>
    </View>
  )
}
