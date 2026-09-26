import { useEffect, useRef, useState } from "react"
import { MessageCircleWarning, SendHorizontal } from "lucide-react"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { useAssistant } from "./useAssistant"
import type { ChatMessage } from "./types"

/**
 * Màn trợ lý — concept-chatbot-v1.md §12. Là một tab ở thanh tab đáy từ M3
 * (doc/design-ui-m3-v1.md §4); Lịch vẫn là màn mở đầu.
 *
 * Không SSE (AssistantService.java giải thích lý do: NumberGuard cần câu trả
 * lời đầy đủ mới quyết được giữ hay bỏ) — nên có "đang trả lời…" thay vì chữ
 * chạy dần.
 */
export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [threadId, setThreadId] = useState<string | null>(null)
  const ask = useAssistant()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, ask.isPending])

  function send() {
    const question = input.trim()
    if (!question || ask.isPending) return
    setInput("")
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "USER", text: question }])

    ask.mutate(
      { question, threadId },
      {
        onSuccess: (res) => {
          setThreadId(res.threadId)
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "ASSISTANT",
              text: res.answer,
              blocked: res.blocked,
              sourceTitles: res.sourceTitles,
            },
          ])
        },
        onError: (err) => {
          const text = err instanceof ApiError ? err.message : "Có lỗi xảy ra, thử lại giúp mình."
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ASSISTANT", text, blocked: true }])
        },
      },
    )
  }

  return (
    // Cao đúng một màn trừ lề trên (pt-8) và phần chừa cho thanh tab (pb-28), để ô nhập
    // nằm ngay trên thanh tab thay vì bị đẩy xuống phải cuộn.
    <div className="flex min-h-[calc(100dvh-144px)] flex-col">
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">Trợ lý</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Hỏi về nguyên lý tập luyện, lịch tuần, hay tiến bộ của bạn. Không thay được bác sĩ hay HLV.
      </p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            Thử hỏi: "RPE là gì?" hoặc "tuần này tôi tập gì?"
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {ask.isPending && (
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
          disabled={!input.trim() || ask.isPending}
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
      </div>
    </div>
  )
}
