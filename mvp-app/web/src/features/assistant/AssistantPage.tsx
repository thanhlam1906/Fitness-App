import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useIsMutating } from "@tanstack/react-query"
import { MessageCircleWarning, SendHorizontal, SquarePen } from "lucide-react"
import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WrongFeedbackButton } from "@/components/WrongFeedbackButton"
import { cn } from "@/lib/cn"
import { clearConversation, getConversation, subscribe } from "./conversation"
import { ASK_KEY, useAssistant } from "./useAssistant"
import type { ChatMessage } from "./types"

/**
 * Màn trợ lý — concept-chatbot-v1.md §12. Là một tab ở thanh tab đáy từ M3
 * (doc/design-ui-m3-v1.md §4); Lịch vẫn là màn mở đầu.
 *
 * Cuộc trò chuyện lưu trên máy (conversation.ts, quyết định 09-29): còn khi chuyển trang, tải lại
 * trang. Nút "Cuộc trò chuyện mới" xoá để bắt đầu lại.
 *
 * Không SSE (AssistantService.java giải thích lý do: NumberGuard cần câu trả
 * lời đầy đủ mới quyết được giữ hay bỏ) — nên có "đang trả lời…" thay vì chữ
 * chạy dần.
 */
export function AssistantPage() {
  const { userId } = useAuth()
  const conversation = useSyncExternalStore(subscribe, () => getConversation(userId!))
  const [input, setInput] = useState("")
  const ask = useAssistant()
  // Không dùng ask.isPending: nó chỉ biết mutation của lần AssistantPage được dựng này, nên rời
  // trang rồi quay lại lúc câu hỏi cũ chưa có trả lời sẽ đọc sai thành "rảnh" (code-reviewer 09-29
  // #2). useIsMutating đọc theo mutationKey, đúng cho mọi lần dựng.
  const pending = useIsMutating({ mutationKey: ASK_KEY }) > 0
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.messages, pending])

  function send() {
    const question = input.trim()
    if (!question || pending || !userId) return
    setInput("")
    ask.mutate({ userId, question, threadId: conversation.threadId })
  }

  return (
    // Cao đúng một màn trừ lề trên (pt-8) và phần chừa cho thanh tab (pb-28), để ô nhập
    // nằm ngay trên thanh tab thay vì bị đẩy xuống phải cuộn.
    <div className="flex min-h-[calc(100dvh-144px)] flex-col">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">Trợ lý</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Hỏi về nguyên lý tập luyện, lịch tuần, hay tiến bộ của bạn. Không thay được bác sĩ hay HLV.
          </p>
        </div>
        <button
          type="button"
          aria-label="Cuộc trò chuyện mới"
          disabled={conversation.messages.length === 0 || pending}
          onClick={() => userId && clearConversation(userId)}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <SquarePen className="size-3.5" aria-hidden />
          Trò chuyện mới
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {conversation.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            Thử hỏi: "RPE là gì?" hoặc "tuần này tôi tập gì?"
          </p>
        )}
        {conversation.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              Đang trả lời…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          aria-label="Câu hỏi"
          placeholder="Hỏi trợ lý…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send()
          }}
        />
        <Button
          size="sm"
          className="min-h-12 shrink-0 px-3.5"
          onClick={send}
          disabled={!input.trim() || pending}
          aria-label="Gửi"
        >
          <SendHorizontal className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-[var(--radius-md)] px-4 py-3 text-[15px] leading-relaxed",
          isUser && "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
          !isUser && !message.blocked && "bg-[var(--color-surface)] text-[var(--color-text)]",
          !isUser && message.blocked && "bg-[var(--color-danger-tint)] text-[var(--color-text)]",
        )}
      >
        {!isUser && message.blocked && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-danger)]">
            <MessageCircleWarning className="size-3.5" aria-hidden />
            Ngoài phạm vi trợ lý
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
        {!!message.sourceTitles?.length && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Nguồn: {message.sourceTitles.join(", ")}
          </p>
        )}
        {/* Bất biến 3: mọi góp ý do máy sinh ra có nút "cái này sai". */}
        {!isUser && message.messageId && (
          <div className="mt-2">
            <WrongFeedbackButton source={{ assistantMessageId: message.messageId }} />
          </div>
        )}
      </div>
    </div>
  )
}
