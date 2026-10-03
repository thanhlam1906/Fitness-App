import * as SecureStore from "expo-secure-store"
import { clearSession, flushForTest, getAccessToken, getStoredSession, hydrate, setSession } from "./tokenStorage"

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (k) => store.get(k) ?? null)
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (k, v) => void store.set(k, v))
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (k) => void store.delete(k))
})

it("nạp phiên đã lưu từ lần mở app trước", async () => {
  store.set("fitness.accessToken", "a1")
  store.set("fitness.refreshToken", "r1")
  store.set("fitness.userId", "u1")
  store.set("fitness.role", "USER")
  await hydrate()
  expect(getAccessToken()).toBe("a1")
  expect(getStoredSession()).toEqual({ userId: "u1", role: "USER" })
})

it("ghi đọc được ngay, xuống máy theo đúng thứ tự", async () => {
  setSession("a2", "r2", "u2", "USER")
  expect(getAccessToken()).toBe("a2")
  clearSession()
  expect(getAccessToken()).toBeNull()
  await flushForTest()
  // Đăng nhập rồi đăng xuất liền: lệnh xoá phải chạy SAU lệnh ghi, không thì mở lại app vẫn đăng nhập.
  expect(store.size).toBe(0)
})
