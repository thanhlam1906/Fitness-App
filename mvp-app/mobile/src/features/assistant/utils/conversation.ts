import AsyncStorage from "@react-native-async-storage/async-storage"
import type { ChatMessage } from "@/features/assistant/types"

/**
 * Cuộc trò chuyện trợ lý lưu trên máy — quyết định 09-29, bản mobile của conversation.ts web
 * (web dùng localStorage). Còn khi chuyển tab, tắt mở lại app. Mất khi bấm "Cuộc trò chuyện mới"
 * hoặc đăng xuất (AuthContext gọi clearAllConversations). Khoá theo userId để tài khoản khác trên
 * cùng máy không thấy cuộc trò chuyện của nhau.
 *
 * AsyncStorage chỉ có hàm async, còn màn Trợ lý đọc đồng bộ qua useSyncExternalStore: lúc mở app
 * nạp hết lên bộ nhớ một lần (app/_layout.tsx chờ), sau đó đọc bộ nhớ, ghi thì ghi bộ nhớ ngay rồi
 * xếp hàng ghi xuống máy — như tokenStorage.
 */
export type Conversation = { threadId: string | null; messages: ChatMessage[] }
type Stored = Partial<Record<string, Conversation>>

const KEY = "fitness.assistant"
const EMPTY: Conversation = { threadId: null, messages: [] }
const listeners = new Set<() => void>()
// Chỉ thay object khi ghi: getSnapshot trả CÙNG tham chiếu khi chưa đổi, không thì
// useSyncExternalStore dựng lại vô hạn (bug thật bên web 09-29).
let all: Stored = {}
let queue: Promise<void> = Promise.resolve()

function persist(op: () => Promise<void>): void {
  // Lỗi ghi máy không chặn trò chuyện: bộ nhớ vẫn đúng tới khi tắt app.
  queue = queue.then(op).catch(() => {})
}

function writeAll(next: Stored): void {
  all = next
  const raw = JSON.stringify(next)
  persist(() => (Object.keys(next).length === 0 ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, raw)))
  listeners.forEach((l) => l())
}

export async function hydrateConversations(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    all = raw ? (JSON.parse(raw) as Stored) : {}
  } catch {
    all = {}
  }
}

export function getConversation(userId: string): Conversation {
  return all[userId] ?? EMPTY
}

/** Đọc-sửa-ghi rồi báo mọi hook đang subscribe dựng lại. */
export function updateConversation(userId: string, update: (c: Conversation) => Conversation): void {
  writeAll({ ...all, [userId]: update(all[userId] ?? EMPTY) })
}

export function clearConversation(userId: string): void {
  const next = { ...all }
  delete next[userId]
  writeAll(next)
}

/** Đăng xuất / hết phiên: xoá cả máy, như tokenStorage.clearSession xoá khoá này bên web. */
export function clearAllConversations(): void {
  writeAll({})
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Chỉ cho test: chờ hàng ghi xuống máy chạy hết. */
export function flushForTest(): Promise<void> {
  return queue
}
