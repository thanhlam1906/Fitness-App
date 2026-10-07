import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAdminUser, useAuditLog, useDeleteUser } from "./useAdminUsers"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

function wrapper() {
  const client = new QueryClient()
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const calls = (prefix: string) => api.get.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length

// Hồ sơ người dùng vẫn đang mở lúc bấm Xoá. Làm mới cả hồ sơ và nhật ký của chính người vừa xoá thì
// chúng tải lại, nhận 404, thử lại 3 lần, và navigate phải chờ hết (~7 s đứng màn, giống useCorpus.test).
describe("sau khi xoá người dùng không tải lại hồ sơ và nhật ký của chính họ", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.get.mockResolvedValue({ id: "u1", items: [], total: 0, page: 0, size: 20 })
    api.del.mockResolvedValue(undefined)
  })

  it("gọi xoá đúng đường dẫn rồi xong ngay, hồ sơ và nhật ký chỉ tải một lần", async () => {
    const { result } = renderHook(
      () => ({ detail: useAdminUser("u1"), audit: useAuditLog("u1", 0), remove: useDeleteUser("u1") }),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.detail.isSuccess && result.current.audit.isSuccess).toBe(true))

    await act(() => result.current.remove.mutateAsync("Spam"))

    expect(api.del).toHaveBeenCalledWith("/admin/users/u1", { reason: "Spam" })
    expect(calls("/admin/users/u1")).toBe(1)
    expect(calls("/admin/audit?")).toBe(1)
  })
})
