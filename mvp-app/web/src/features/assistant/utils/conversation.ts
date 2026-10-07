import { ASSISTANT_KEY } from "@/features/auth/utils/tokenStorage"
import type { ChatMessage } from "@/features/assistant/types"

/**
 * Cuộc trò chuyện trợ lý lưu trên máy này — quyết định 09-29 (thay quyết định cũ "mất khi rời
 * trang" ở useAssistant.ts trước đây): còn khi chuyển trang, tải lại trang, tắt mở lại trình
 * duyệt. Mất khi bấm "Cuộc trò chuyện mới" hoặc đăng xuất (`tokenStorage.clearSession` xoá thẳng
 * khoá trong localStorage, không gọi qua module này).
 *
 * Khoá theo userId để tài khoản khác trên cùng máy không thấy cuộc trò chuyện của nhau.
 */
export type Conversation = { threadId: string | null; messages: ChatMessage[] }
type Stored = Partial<Record<string, Conversation>>

const EMPTY: Conversation = { threadId: null, messages: [] }
const listeners = new Set<() => void>()
// AssistantPage đọc qua useSyncExternalStore: getSnapshot phải trả CÙNG tham chiếu khi nội dung
// localStorage chưa đổi, kể cả khi thứ xoá khoá là clearSession (không đi qua module này) —
// khác parse lại JSON mỗi lần gọi (ra object mới, gây vòng lặp vô hạn, thấy khi kiểm UI 09-29).
// Nên cache theo chuỗi thô: còn giống lần đọc trước thì trả nguyên object cũ.
let lastRaw: string | null = null
let lastParsed: Stored = {}

function readAll(): Stored {
  const raw = localStorage.getItem(ASSISTANT_KEY)
  if (raw === lastRaw) return lastParsed
  lastRaw = raw
  try {
    lastParsed = raw ? (JSON.parse(raw) as Stored) : {}
  } catch {
    lastParsed = {}
  }
  return lastParsed
}

export function getConversation(userId: string): Conversation {
  return readAll()[userId] ?? EMPTY
}

function writeAll(all: Stored): void {
  lastRaw = JSON.stringify(all)
  lastParsed = all
  localStorage.setItem(ASSISTANT_KEY, lastRaw)
  listeners.forEach((l) => l())
}

/** Đọc-sửa-ghi rồi báo mọi hook đang subscribe re-render. */
export function updateConversation(userId: string, update: (c: Conversation) => Conversation): void {
  const all = readAll()
  writeAll({ ...all, [userId]: update(all[userId] ?? EMPTY) })
}

export function clearConversation(userId: string): void {
  const all = { ...readAll() }
  delete all[userId]
  writeAll(all)
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
