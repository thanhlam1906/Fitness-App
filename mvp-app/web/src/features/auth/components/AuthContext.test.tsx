import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./AuthContext"
import { setSession } from "@/features/auth/utils/tokenStorage"

vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api: { post: vi.fn(() => Promise.resolve()) },
}))

// jsdom ở cấu hình này không dựng được localStorage thật (xem api/client.test.ts).
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  setSession("access", "refresh", "u1", "USER")
})
afterEach(() => vi.unstubAllGlobals())

it("đăng xuất xoá cả cache: người đăng nhập sau trên cùng tab không thấy dữ liệu người trước", () => {
  const client = new QueryClient()
  client.setQueryData(["profile"], { fullName: "Người trước" })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
  const { result } = renderHook(() => useAuth(), { wrapper })

  act(() => result.current.logout())

  expect(result.current.isAuthenticated).toBe(false)
  expect(client.getQueryData(["profile"])).toBeUndefined()
})
