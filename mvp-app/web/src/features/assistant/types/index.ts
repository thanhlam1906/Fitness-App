// Khớp AssistantController.AskResponse (backend). Vòng 0: không SSE, trả một lần.
export type AskResponse = {
  /** Dòng câu trả lời đã lưu ở server — nút "cái này sai" gửi kèm id này. */
  messageId: string
  answer: string
  blocked: boolean
  threadId: string
  sourceTitles: string[]
  toolsCalled: string[]
  guardResult: "OK" | "NUMBERS_UNGROUNDED" | "BLOCKED_D"
}

export type ChatMessage = {
  id: string
  role: "USER" | "ASSISTANT"
  text: string
  blocked?: boolean
  sourceTitles?: string[]
  /**
   * Id câu trả lời ở server. Chỉ câu trả lời thật có; bong bóng báo lỗi mạng do web tự sinh thì
   * không (không phải góp ý của máy, không có gì để báo sai). Tin cũ lưu trước 09-29 cũng không có.
   */
  messageId?: string
}
