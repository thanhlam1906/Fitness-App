import { useMutation } from "@tanstack/react-query"
import { ApiError, api } from "~/api/client"
import { getStoredSession } from "~/features/auth/utils/tokenStorage"
import { updateConversation, type Conversation } from "~/features/assistant/utils/conversation"
import type { AskResponse } from "@/features/assistant/types"

// Id tin chỉ dùng làm key trên máy; Hermes không có crypto.randomUUID như trình duyệt.
const localId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// Cùng key cho mọi lần dựng màn Trợ lý — react-query giữ trạng thái theo key này chứ không
// theo component, nên rời trang rồi quay lại lúc câu hỏi cũ chưa có trả lời vẫn thấy "đang chờ"
// đúng (code-reviewer 09-29 #2): đọc bằng useIsMutating({ mutationKey: ASK_KEY }).
export const ASK_KEY = ["assistant", "ask"]

/**
 * Không dùng react-query cho lịch sử hội thoại (không phải dữ liệu server cần đồng bộ nhiều
 * nơi) — conversation.ts giữ trên máy, hook này chỉ lo gọi API và ghi kết quả vào đó.
 *
 * Ghi ở đây (trong mutationFn), không phải ở component: mutation còn chạy tiếp dù màn Trợ lý đã
 * unmount (chuyển tab lúc đang chờ), nên câu trả lời không mất.
 */
export function useAssistant() {
  return useMutation({
    mutationKey: ASK_KEY,
    mutationFn: async (body: { userId: string; question: string; threadId: string | null }) => {
      // Đăng xuất / hết phiên (401 tự đăng xuất, xem api/client.ts) lúc đang chờ đã xoá cuộc trò
      // chuyện — không được ghi lại (code-reviewer 09-29 #1).
      const save = (update: (c: Conversation) => Conversation) => {
        if (getStoredSession()?.userId === body.userId) updateConversation(body.userId, update)
      }
      save((c) => ({
        ...c,
        messages: [...c.messages, { id: localId(), role: "USER", text: body.question }],
      }))
      try {
        const res = await api.post<AskResponse>("/assistant/messages", {
          question: body.question,
          threadId: body.threadId,
        })
        save((c) => ({
          threadId: res.threadId,
          messages: [
            ...c.messages,
            {
              id: localId(),
              role: "ASSISTANT",
              text: res.answer,
              blocked: res.blocked,
              sourceTitles: res.sourceTitles,
              messageId: res.messageId,
            },
          ],
        }))
        return res
      } catch (err) {
        const text = err instanceof ApiError ? err.message : "Có lỗi xảy ra, thử lại giúp mình."
        save((c) => ({
          ...c,
          messages: [...c.messages, { id: localId(), role: "ASSISTANT", text, blocked: true }],
        }))
        throw err
      }
    },
  })
}
