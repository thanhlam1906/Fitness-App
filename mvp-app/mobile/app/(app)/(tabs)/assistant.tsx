import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useIsMutating } from "@tanstack/react-query"
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, SquarePen, TrendingUp } from "lucide-react-native"
import type { ChatMessage } from "@/features/assistant/types"
import { cn } from "@/lib/cn"
import { useAuth } from "~/features/auth/components/AuthContext"
import { AssistantMark } from "~/components/AssistantMark"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { clearConversation, getConversation, subscribe } from "~/features/assistant/utils/conversation"
import { ASK_KEY, useAssistant } from "~/features/assistant/api/useAssistant"
import { colors } from "~/theme"

/** Ba câu mẫu phủ ba loại trợ lý trả lời được: lịch, tiến bộ (tool), kiến thức (tài liệu). */
const SUGGESTIONS = [
  { question: "Tuần này tôi tập gì?", hint: "Xem lịch của bạn", Icon: CalendarDays },
  { question: "4 tuần qua tôi tiến bộ thế nào?", hint: "Tổng tạ, số buổi đã tập", Icon: TrendingUp },
  { question: "RPE là gì?", hint: "Từ tài liệu của app", Icon: BookOpen },
]

/**
 * Màn trợ lý — bản mobile của AssistantPage web, giao diện theo mockup doc/mockup-tro-ly/demo.html
 * (duyệt 10-08). Cuộc trò chuyện lưu trên máy (quyết định 09-29). Không SSE (NumberGuard cần câu
 * trả lời đầy đủ mới quyết giữ hay bỏ) nên có ba chấm "đang trả lời" thay vì chữ chạy dần.
 *
 * Không dùng Screen chung: ô nhập phải dính ngay trên bàn phím và thanh tab, danh sách tin tự cuộn.
 */
export default function AssistantScreen() {
  const insets = useSafeAreaInsets()
  const { userId } = useAuth()
  const conversation = useSyncExternalStore(subscribe, () => getConversation(userId!))
  const [input, setInput] = useState("")
  const [focused, setFocused] = useState(false)
  const ask = useAssistant()
  // Không dùng ask.isPending: nó chỉ biết mutation của lần dựng màn này, nên chuyển tab rồi quay lại
  // lúc câu cũ chưa có trả lời sẽ đọc sai thành "rảnh" (code-reviewer 09-29 #2).
  const pending = useIsMutating({ mutationKey: ASK_KEY }) > 0
  const list = useRef<ScrollView>(null)
  const empty = conversation.messages.length === 0

  function send(text: string) {
    const question = text.trim()
    if (!question || pending || !userId) return
    // Bấm câu mẫu thì giữ nguyên chữ người dùng đang gõ dở.
    if (text === input) setInput("")
    ask.mutate({ userId, question, threadId: conversation.threadId })
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-bg">
      <View className="flex-1 px-5 pb-3" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center gap-2.5">
          <AssistantMark size={34} />
          <Text className="flex-1 text-[17px] font-extrabold tracking-[-0.2px] text-text">Trợ lý VFit</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cuộc trò chuyện mới"
            accessibilityState={{ disabled: empty || pending }}
            disabled={empty || pending}
            onPress={() => userId && clearConversation(userId)}
            className={cn("size-9 items-center justify-center rounded-md bg-surface", (empty || pending) && "opacity-40")}
          >
            <SquarePen size={16} color={colors["text-muted"]} />
          </Pressable>
        </View>

        {empty && !pending ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow items-center justify-center px-2 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <AssistantMark size={64} />
            <Text className="mt-4 text-center text-2xl font-extrabold tracking-[-0.5px] text-text">Hỏi gì về buổi tập?</Text>
            <Text className="mb-5 mt-1.5 text-center text-sm text-text-muted">
              Lịch tuần, mức tạ, tiến bộ của bạn, hay một khái niệm bạn chưa rõ.
            </Text>
            <View className="w-full gap-2">
              {SUGGESTIONS.map(({ question, hint, Icon }) => (
                <Pressable
                  key={question}
                  accessibilityRole="button"
                  onPress={() => send(question)}
                  className="flex-row items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 active:bg-surface-2"
                >
                  <Icon size={18} color={colors.accent} />
                  <View className="flex-1">
                    <Text className="text-sm text-text">{question}</Text>
                    <Text className="text-xs text-text-muted">{hint}</Text>
                  </View>
                  <ChevronRight size={16} color={colors["text-muted"]} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            ref={list}
            className="mt-4 flex-1"
            contentContainerClassName="gap-3.5 pb-2"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            // Tin mới hay ba chấm làm nội dung dài ra: cuộn xuống cuối như web scrollIntoView.
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          >
            {conversation.messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {pending && (
              <View accessible accessibilityLabel="Đang trả lời" className="flex-row items-start gap-2.5">
                <AssistantMark />
                <TypingDots />
              </View>
            )}
          </ScrollView>
        )}

        <View
          className={cn(
            "mt-3 flex-row items-center gap-2 rounded-full border bg-surface py-1.5 pl-4 pr-1.5",
            focused ? "border-accent" : "border-border",
          )}
        >
          <TextInput
            accessibilityLabel="Câu hỏi"
            placeholder="Hỏi trợ lý…"
            placeholderTextColor={colors["text-muted"]}
            className="h-9 flex-1 text-[15px] text-text"
            value={input}
            onChangeText={setInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            submitBehavior="submit"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi"
            accessibilityState={{ disabled: !input.trim() || pending }}
            disabled={!input.trim() || pending}
            onPress={() => send(input)}
            className={cn("size-[38px] items-center justify-center rounded-full bg-accent", (!input.trim() || pending) && "opacity-40")}
          >
            <ArrowRight size={16} strokeWidth={2.4} color={colors["accent-fg"]} />
          </Pressable>
        </View>
        <Text className="mt-2 text-center text-[11px] text-text-muted">Không thay được bác sĩ hay huấn luyện viên.</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "USER") {
    return (
      <View className="max-w-[80%] self-end rounded-[18px] rounded-br-md bg-surface-2 px-3.5 py-2.5">
        <Text selectable className="text-[15px] leading-[24px] text-text">
          {message.text}
        </Text>
      </View>
    )
  }
  return (
    <View className="flex-row items-start gap-2.5">
      <AssistantMark />
      <View className={cn("flex-1", message.blocked && "border-l-2 border-danger pl-2.5")}>
        {/* Bong bóng lỗi mạng do app tự sinh cũng blocked nhưng không có messageId: đó không phải bị từ chối. */}
        {message.blocked && message.messageId && (
          <Text className="mb-0.5 text-xs font-semibold text-danger">Ngoài phạm vi trợ lý</Text>
        )}
        <Text selectable className="text-[15px] leading-[24px] text-text">
          {message.text}
        </Text>
        {!!message.sourceTitles?.length && (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {message.sourceTitles.map((title) => (
              <View key={title} className="rounded-sm border border-border px-1.5 py-0.5">
                <Text className="text-[11px] text-text-muted">↳ {title}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Bất biến: mọi góp ý do máy sinh ra có nút "cái này sai". */}
        {message.messageId && (
          <View className="mt-1.5">
            <WrongFeedbackButton source={{ assistantMessageId: message.messageId }} />
          </View>
        )}
      </View>
    </View>
  )
}

/** Ba chấm nảy lệch nhau 150ms như animate-bounce của web; bật giảm chuyển động thì đứng yên. */
function TypingDots() {
  return (
    <View className="flex-row gap-1 pt-3">
      {[0, 150, 300].map((delay) => (
        <Dot key={delay} delay={delay} />
      ))}
    </View>
  )
}

function Dot({ delay }: { delay: number }) {
  const y = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1))
  }, [delay, reduced, y])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  // Style thường thay vì className: NativeWind không gắn class cho Animated.View của reanimated.
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors["text-muted"] }, style]} />
}
