import { useSyncExternalStore, type ComponentType, type ReactNode } from "react"
import { useIsMutating } from "@tanstack/react-query"
import { Camera, MessageCircle, Trash2 } from "lucide-react"
import { useAuth } from "@/features/auth/components/AuthContext"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { cn } from "@/lib/cn"
import { clearConversation, getConversation, subscribe } from "@/features/assistant/utils/conversation"
import { ASK_KEY } from "@/features/assistant/api/useAssistant"
import { SettingsSubLayout } from "@/features/profile/components/SettingsSubLayout"

/**
 * Cài đặt › Dữ liệu & quyền riêng tư. Chỉ nói điều app THẬT SỰ làm (bất biến: clip xoá ngay sau
 * khi chấm; màn camera chỉ gửi toạ độ khớp). Máy chủ vẫn lưu câu hỏi/trả lời trợ lý
 * (assistant_messages) — ghi rõ, để nút xoá không bị hiểu là xoá cả trên máy chủ.
 */
export function PrivacyPage() {
  const { userId } = useAuth()
  const conversation = useSyncExternalStore(subscribe, () => getConversation(userId ?? ""))
  const count = conversation.messages.length
  // Câu trả lời đang chờ sẽ ghi lại vào cuộc trò chuyện vừa xoá (mutation chạy tiếp dù đã rời
  // màn trợ lý) — chờ nó xong mới cho xoá, như nút "Trò chuyện mới" (code-reviewer 09-29 #2).
  const answering = useIsMutating({ mutationKey: ASK_KEY }) > 0

  return (
    <SettingsSubLayout title="Dữ liệu & quyền riêng tư">
      <Card Icon={Camera} title="Camera chấm form">
        Chỉ gửi <b className="font-semibold text-[var(--color-text)]">toạ độ các khớp</b>, không gửi hình hay video
        của bạn.
      </Card>
      <Card Icon={Trash2} title="Clip bạn gửi">
        Clip bị <b className="font-semibold text-[var(--color-text)]">xoá ngay sau khi chấm</b>, kể cả khi chấm lỗi.
        Không ai tải lại được, kể cả quản trị viên.
      </Card>
      <Card Icon={MessageCircle} title="Trợ lý">
        Cuộc trò chuyện hiện tại lưu <b className="font-semibold text-[var(--color-text)]">trên máy này</b> để bạn
        chuyển trang không bị mất. Máy chủ vẫn lưu câu hỏi và trả lời để cải thiện trợ lý.
        <button
          type="button"
          disabled={count === 0 || !userId || answering}
          onClick={() => userId && clearConversation(userId)}
          className={cn(
            "mt-3 h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-tint)] text-sm font-bold text-[var(--color-danger)] disabled:opacity-40",
            SHEET_FOCUS,
          )}
        >
          {count === 0
            ? "Không có cuộc trò chuyện nào trên máy"
            : answering
              ? "Trợ lý đang trả lời, chờ chút rồi xoá"
              : `Xoá cuộc trò chuyện trên máy (${count} tin)`}
        </button>
      </Card>
    </SettingsSubLayout>
  )
}

function Card({
  Icon,
  title,
  children,
}: {
  Icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 first-of-type:mt-4">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <Icon className="size-[18px] text-[var(--color-accent)]" aria-hidden />
        {title}
      </h2>
      <div className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{children}</div>
    </section>
  )
}
