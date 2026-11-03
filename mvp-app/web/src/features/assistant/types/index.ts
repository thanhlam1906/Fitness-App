/** Thẻ bài trả kèm câu trả lời (ExerciseCardResponse ở backend): nội dung đọc thẳng từ DB, trợ lý không tự viết. */
export type ExerciseCard = {
  slug: string
  nameEn: string
  /** Phần tử đầu là cơ chính. */
  muscleGroups: string[]
  equipment: string[]
  stepsVi: string[]
  mistakesVi: string[]
}

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
  /** Tối đa 3; rỗng khi không có bài khớp, bị chặn hay trả lời dự phòng. */
  exercises: ExerciseCard[]
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
  /** Thẻ bài của câu trả lời. Tin lưu trước khi có thư viện bài không có trường này. */
  exercises?: ExerciseCard[]
}
