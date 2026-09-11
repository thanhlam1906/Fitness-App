import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { AskResponse } from "./types"

/**
 * Không dùng react-query cho lịch sử hội thoại (không phải dữ liệu server cần
 * đồng bộ nhiều nơi) — mảng tin nhắn giữ trong AssistantPage, hook này chỉ lo
 * gọi API. Một threadId cho cả phiên mở trang, mất khi rời trang — đúng mức
 * "tab phụ" của §12, không phải nơi lưu trữ chính.
 */
export function useAssistant() {
  return useMutation({
    mutationFn: (body: { question: string; threadId: string | null }) =>
      api.post<AskResponse>("/assistant/messages", body),
  })
}
