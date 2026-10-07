import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  clearAllConversations,
  clearConversation,
  flushForTest,
  getConversation,
  hydrateConversations,
  subscribe,
  updateConversation,
} from "./conversation"

const KEY = "fitness.assistant"
const msg = (text: string) => ({ id: text, role: "USER" as const, text })

beforeEach(async () => {
  clearAllConversations()
  await flushForTest()
  await AsyncStorage.clear()
})

it("nạp cuộc trò chuyện đã lưu từ lần mở app trước, tách theo userId", async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ u1: { threadId: "t1", messages: [msg("chào")] } }))
  await hydrateConversations()
  expect(getConversation("u1")).toEqual({ threadId: "t1", messages: [msg("chào")] })
  expect(getConversation("u2").messages).toEqual([])
})

// useSyncExternalStore gọi getSnapshot liên tục: object mới mỗi lần là vòng lặp vô hạn (bug thật bên web 09-29).
it("đọc lại khi chưa đổi gì trả đúng cùng một object", () => {
  updateConversation("u1", (c) => ({ ...c, messages: [msg("a")] }))
  expect(getConversation("u1")).toBe(getConversation("u1"))
  expect(getConversation("ai-đó")).toBe(getConversation("người-khác"))
})

it("ghi thì báo người đang theo dõi và lưu xuống máy", async () => {
  const listener = jest.fn()
  const off = subscribe(listener)
  updateConversation("u1", (c) => ({ threadId: "t9", messages: [...c.messages, msg("b")] }))
  expect(listener).toHaveBeenCalledTimes(1)
  await flushForTest()
  expect(JSON.parse((await AsyncStorage.getItem(KEY))!)).toEqual({ u1: { threadId: "t9", messages: [msg("b")] } })
  off()
})

it("trò chuyện mới chỉ xoá của người đó; đăng xuất xoá hết cả trên máy", async () => {
  updateConversation("u1", (c) => ({ ...c, messages: [msg("x")] }))
  updateConversation("u2", (c) => ({ ...c, messages: [msg("y")] }))
  clearConversation("u1")
  expect(getConversation("u1").messages).toEqual([])
  expect(getConversation("u2").messages).toEqual([msg("y")])
  clearAllConversations()
  expect(getConversation("u2").messages).toEqual([])
  await flushForTest()
  expect(await AsyncStorage.getItem(KEY)).toBeNull()
})
