import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useIsMutating } from "@tanstack/react-query"
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, SquarePen, TrendingUp } from "lucide-react"
import { useAuth } from "@/features/auth/components/AuthContext"
import { AssistantMark } from "@/components/AssistantMark"
import { WrongFeedbackButton } from "@/features/feedback/components/WrongFeedbackButton"
import { cn } from "@/lib/cn"
import { clearConversation, getConversation, subscribe } from "@/features/assistant/utils/conversation"
import { ASK_KEY, useAssistant } from "@/features/assistant/api/useAssistant"
import type { ChatMessage } from "@/features/assistant/types"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"

/** Ba câu mẫu phủ ba loại trợ lý trả lời được: lịch, tiến bộ (tool), kiến thức (tài liệu). */
const SUGGESTIONS = [
  { question: "Tuần này tôi tập gì?", hint: "Xem lịch của bạn", Icon: CalendarDays },
  { question: "4 tuần qua tôi tiến bộ thế nào?", hint: "Tổng tạ, số buổi đã tập", Icon: TrendingUp },
  { question: "RPE là gì?", hint: "Từ tài liệu của app", Icon: BookOpen },
]

/**
 * Màn trợ lý — concept-chatbot-v1.md §12, giao diện theo mockup doc/mockup-tro-ly/demo.html
 * (duyệt 10-08). Là một tab ở thanh tab đáy từ M3 (doc/design-ui-m3-v1.md §4); Lịch vẫn là màn mở đầu.
 *
 * Cuộc trò chuyện lưu trên máy (conversation.ts, quyết định 09-29): còn khi chuyển trang, tải lại
 * trang. Nút "Cuộc trò chuyện mới" xoá để bắt đầu lại.
 *
 * Không SSE (AssistantService.java giải thích lý do: NumberGuard cần câu trả
 * lời đầy đủ mới quyết được giữ hay bỏ) — nên có ba chấm "đang trả lời" thay vì chữ
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
  const empty = conversation.messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.messages, pending])

  function send(text: string) {
    const question = text.trim()
    if (!question || pending || !userId) return
    // Bấm câu mẫu thì giữ nguyên chữ người dùng đang gõ dở.
    if (text === input) setInput("")
    ask.mutate({ userId, question, threadId: conversation.threadId })
  }

  return (
    // Cao đúng một màn trừ lề trên (pt-8) và phần chừa cho thanh tab (pb-28), để ô nhập
    // nằm ngay trên thanh tab thay vì bị đẩy xuống phải cuộn.
    <div className="flex min-h-[calc(100dvh-144px)] flex-col">
      <div className="flex items-center gap-2.5">
        <AssistantMark size={34} />
        <h1 className="min-w-0 flex-1 text-[17px] font-extrabold tracking-[-0.01em]">Trợ lý VFit</h1>
        <button
          type="button"
          aria-label="Cuộc trò chuyện mới"
          title="Cuộc trò chuyện mới"
          disabled={empty || pending}
          onClick={() => userId && clearConversation(userId)}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-40",
            FOCUS,
          )}
        >
          <SquarePen className="size-4" aria-hidden />
        </button>
      </div>

      {empty && !pending ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
          <AssistantMark size={64} />
          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.02em]">Hỏi gì về buổi tập?</h2>
          <p className="mt-1.5 mb-5 text-sm text-[var(--color-text-muted)]">
            Lịch tuần, mức tạ, tiến bộ của bạn, hay một khái niệm bạn chưa rõ.
          </p>
          <div className="flex w-full flex-col gap-2">
            {SUGGESTIONS.map(({ question, hint, Icon }) => (
              <button
                key={question}
                type="button"
                onClick={() => send(question)}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-left hover:bg-[var(--color-surface-2)]",
                  FOCUS,
                )}
              >
                <Icon className="size-[18px] shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{question}</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">{hint}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-3.5 overflow-y-auto">
          {conversation.messages.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
          {pending && (
            <div className="flex items-start gap-2.5" role="status" aria-label="Đang trả lời">
              <AssistantMark />
              <div className="flex gap-1 pt-3">
                {[0, 150, 300].map((delay) => (
                  <i
                    key={delay}
                    style={{ animationDelay: `${delay}ms` }}
                    className="size-1.5 animate-bounce rounded-full bg-[var(--color-text-muted)] motion-reduce:animate-none"
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pr-1.5 pl-4 focus-within:border-[var(--color-accent)]">
        <input
          aria-label="Câu hỏi"
          placeholder="Hỏi trợ lý…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input)
          }}
          className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!input.trim() || pending}
          aria-label="Gửi"
          className={cn(
            "grid size-9.5 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] disabled:opacity-40",
            FOCUS,
          )}
        >
          <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--color-text-muted)]">
        Không thay được bác sĩ hay huấn luyện viên.
      </p>
    </div>
  )
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "USER") {
    return (
      <div className="max-w-[80%] self-end rounded-[18px] rounded-br-md bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[15px] leading-relaxed">
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5">
      <AssistantMark />
      <div
        className={cn(
          "min-w-0 flex-1 text-[15px] leading-relaxed",
          message.blocked && "border-l-2 border-[var(--color-danger)] pl-2.5",
        )}
      >
        {/* Bong bóng lỗi mạng do web tự sinh cũng blocked nhưng không có messageId: đó không phải bị từ chối. */}
        {message.blocked && message.messageId && (
          <div className="mb-0.5 text-xs font-semibold text-[var(--color-danger)]">Ngoài phạm vi trợ lý</div>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
        {!!message.sourceTitles?.length && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sourceTitles.map((title) => (
              <span
                key={title}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)]"
              >
                ↳ {title}
              </span>
            ))}
          </div>
        )}
        {/* Bất biến 3: mọi góp ý do máy sinh ra có nút "cái này sai". */}
        {message.messageId && (
          <div className="mt-1.5">
            <WrongFeedbackButton source={{ assistantMessageId: message.messageId }} />
          </div>
        )}
      </div>
    </div>
  )
}
