import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider, useIsMutating } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ASSISTANT_KEY, clearSession, setSession } from "@/auth/tokenStorage"
import { getConversation, updateConversation, type Conversation } from "./conversation"
import { ASK_KEY, useAssistant } from "./useAssistant"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api: { post },
}))

const say = (text: string) => (c: Conversation): Conversation => ({
  ...c,
  messages: [...c.messages, { id: text, role: "USER", text }],
})

// jsdom ở cấu hình này không dựng được localStorage thật (xem client.test.ts) — stub bằng Map,
// đủ cho get/set/remove nhiều khoá mà conversation.ts và tokenStorage.ts cần.
function stubLocalStorage() {
  const data = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  })
}

beforeEach(() => {
  stubLocalStorage()
  post.mockReset()
  setSession("access", "refresh", "u1", "USER")
})

afterEach(() => vi.unstubAllGlobals())

describe("cuộc trò chuyện trên máy", () => {
  it("tải lại trang vẫn còn", async () => {
    updateConversation("u1", (c) => ({ ...say("Chào")(c), threadId: "t1" }))
    vi.resetModules() // như tải lại trang: bộ nhớ trong module mất, chỉ còn localStorage
    const fresh = await import("./conversation")
    expect(fresh.getConversation("u1")).toEqual({
      threadId: "t1",
      messages: [{ id: "Chào", role: "USER", text: "Chào" }],
    })
  })

  it("tài khoản khác trên cùng máy không thấy", () => {
    updateConversation("u1", say("Chào"))
    setSession("access", "refresh", "u2", "USER")
    expect(getConversation("u2").messages).toEqual([])
  })

  it("đăng xuất thì mất", () => {
    updateConversation("u1", say("Chào"))
    clearSession()
    expect(getConversation("u1").messages).toEqual([])
    expect(localStorage.getItem(ASSISTANT_KEY)).toBeNull()
  })

  it("dữ liệu hỏng thì coi như chưa có", () => {
    localStorage.setItem(ASSISTANT_KEY, "{hỏng")
    expect(getConversation("u1")).toEqual({ threadId: null, messages: [] })
  })
})

describe("useAssistant", () => {
  // Một client dùng chung TRONG một test (không giữa các test): useIsMutating chỉ thấy mutation
  // chạy trên cùng client, đúng cảnh AssistantPage dựng lại vẫn đọc chung cache của react-query.
  let client: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  beforeEach(() => {
    client = new QueryClient()
  })

  it("quay lại trang lúc câu hỏi cũ chưa có trả lời vẫn thấy đang chờ (code-reviewer 09-29 #2)", () => {
    let answer!: (v: unknown) => void
    post.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result: ask, unmount } = renderHook(() => useAssistant(), { wrapper })
    ask.current.mutate({ userId: "u1", question: "RPE là gì?", threadId: null })
    unmount() // rời trang: AssistantPage cũ bị huỷ, ask.isPending của nó không còn ai đọc

    // AssistantPage dựng lại (vd quay lại trang) không có mutation riêng nào đang pending, nhưng
    // useIsMutating theo mutationKey vẫn phải thấy request cũ đang chạy.
    const { result: pending } = renderHook(() => useIsMutating({ mutationKey: ASK_KEY }), { wrapper })
    expect(pending.current).toBe(1)
    answer({ answer: "...", blocked: false, threadId: "t1", sourceTitles: [] })
  })

  it("rời trang lúc đang chờ thì câu trả lời vẫn được lưu", async () => {
    let answer!: (v: unknown) => void
    post.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result, unmount } = renderHook(() => useAssistant(), { wrapper })
    result.current.mutate({ userId: "u1", question: "RPE là gì?", threadId: null })
    unmount()
    answer({ answer: "RPE là mức gắng sức.", blocked: false, threadId: "t9", sourceTitles: ["Bài 1"] })
    await waitFor(() => expect(getConversation("u1").messages).toHaveLength(2))
    expect(getConversation("u1")).toMatchObject({
      threadId: "t9",
      messages: [
        { role: "USER", text: "RPE là gì?" },
        { role: "ASSISTANT", text: "RPE là mức gắng sức.", sourceTitles: ["Bài 1"] },
      ],
    })
    expect(post).toHaveBeenCalledWith("/assistant/messages", { question: "RPE là gì?", threadId: null })
  })

  it("đăng xuất lúc đang chờ thì câu trả lời không ghi lại (code-reviewer 09-29 #1)", async () => {
    let answer!: (v: unknown) => void
    post.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result } = renderHook(() => useAssistant(), { wrapper })
    result.current.mutate({ userId: "u1", question: "RPE là gì?", threadId: null })
    clearSession()
    answer({ answer: "RPE là mức gắng sức.", blocked: false, threadId: "t9", sourceTitles: [] })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(localStorage.getItem(ASSISTANT_KEY)).toBeNull()
  })
})
