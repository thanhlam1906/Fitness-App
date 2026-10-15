import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { UserListPage } from "./UserListPage"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }

beforeEach(() => {
  vi.resetAllMocks()
  window.history.replaceState(null, "", "/admin/users")
  // Số liệu không bao giờ về: đúng lúc admin đổi bộ lọc khi bảng còn đang chờ.
  api.get.mockImplementation(() => new Promise(() => {}))
})

afterEach(cleanup)

describe("UserListPage: đổi hai bộ lọc liền nhau", () => {
  it("chọn tab trạng thái rồi chọn vai trò ngay thì URL giữ cả hai", async () => {
    // Cùng router với main.tsx: BrowserRouter mặc định cập nhật vị trí trong startTransition.
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <BrowserRouter>
          <UserListPage />
        </BrowserRouter>
      </QueryClientProvider>,
    )
    const locked = await screen.findByRole("button", { name: "Đã khoá" })
    const role = screen.getByRole<HTMLSelectElement>("combobox", { name: "Lọc theo vai trò" })

    // Bắn sự kiện thẳng, không qua act: act render xong transition giữa hai lần bấm nên che mất lỗi.
    // Giữa hai sự kiện thật của trình duyệt chỉ chắc chạy được microtask, transition có thể chưa render.
    actEnv.IS_REACT_ACT_ENVIRONMENT = false
    try {
      locked.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      role.value = "ADMIN"
      role.dispatchEvent(new Event("change", { bubbles: true }))
    } finally {
      actEnv.IS_REACT_ACT_ENVIRONMENT = true
    }

    const url = new URLSearchParams(window.location.search)
    expect(url.get("status")).toBe("LOCKED")
    expect(url.get("role")).toBe("ADMIN")
  })
})
