// Khớp AssistantController.AskResponse (backend). Vòng 0: không SSE, trả một lần.
export type AskResponse = {
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
}
