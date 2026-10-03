import * as SecureStore from "expo-secure-store"

/**
 * Token lưu trong Keychain (expo-secure-store), không lưu chỗ thường như localStorage bên web.
 * SecureStore chỉ có hàm async, còn client.ts và AuthContext cần đọc đồng bộ như web: lúc mở app
 * nạp hết lên bộ nhớ một lần (app/_layout.tsx chờ hydrate), sau đó đọc bộ nhớ; ghi thì ghi bộ
 * nhớ ngay rồi xếp hàng ghi xuống máy theo đúng thứ tự gọi.
 */
const ACCESS_KEY = "fitness.accessToken"
const REFRESH_KEY = "fitness.refreshToken"
const USER_ID_KEY = "fitness.userId"
const ROLE_KEY = "fitness.role"
const KEYS = [ACCESS_KEY, REFRESH_KEY, USER_ID_KEY, ROLE_KEY]

export type StoredSession = { userId: string; role: string }

const cache = new Map<string, string>()
let queue: Promise<void> = Promise.resolve()

function persist(op: () => Promise<void>): void {
  // Lỗi ghi Keychain không chặn app: bộ nhớ vẫn đúng tới khi tắt app.
  queue = queue.then(op).catch(() => {})
}

function set(key: string, value: string): void {
  cache.set(key, value)
  persist(() => SecureStore.setItemAsync(key, value))
}

function remove(key: string): void {
  cache.delete(key)
  persist(() => SecureStore.deleteItemAsync(key))
}

export async function hydrate(): Promise<void> {
  const values = await Promise.all(KEYS.map((k) => SecureStore.getItemAsync(k)))
  KEYS.forEach((k, i) => {
    const v = values[i]
    if (v !== null) cache.set(k, v)
  })
}

export function getAccessToken(): string | null {
  return cache.get(ACCESS_KEY) ?? null
}

export function getRefreshToken(): string | null {
  return cache.get(REFRESH_KEY) ?? null
}

export function getStoredSession(): StoredSession | null {
  const userId = cache.get(USER_ID_KEY)
  const role = cache.get(ROLE_KEY)
  return userId && role ? { userId, role } : null
}

export function setSession(accessToken: string, refreshToken: string, userId: string, role: string): void {
  set(ACCESS_KEY, accessToken)
  set(REFRESH_KEY, refreshToken)
  set(USER_ID_KEY, userId)
  set(ROLE_KEY, role)
}

/** Chỉ token đổi (sau refresh) — userId/role giữ nguyên, không cần set lại. */
export function setTokens(accessToken: string, refreshToken: string): void {
  set(ACCESS_KEY, accessToken)
  set(REFRESH_KEY, refreshToken)
}

export function clearSession(): void {
  KEYS.forEach(remove)
}

/** Chỉ cho test: chờ hàng ghi xuống máy chạy hết. */
export function flushForTest(): Promise<void> {
  return queue
}
