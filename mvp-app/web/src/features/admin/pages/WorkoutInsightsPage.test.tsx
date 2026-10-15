import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WorkoutInsightsPage } from "./WorkoutInsightsPage"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }

beforeEach(() => {
  vi.resetAllMocks()
  window.history.replaceState(null, "", "/admin/sessions?days=30")
  // Số liệu không bao giờ về: đúng lúc người dùng đổi bộ lọc khi bảng còn đang chờ.
  api.get.mockImplementation((path: string) =>
    path === "/program-templates" ? Promise.resolve([{ id: "t1", name: "Toàn thân" }]) : new Promise(() => {}),
  )
})

afterEach(cleanup)

describe("WorkoutInsightsPage: đổi hai bộ lọc liền nhau", () => {
  it("đổi khoảng ngày rồi đổi template ngay thì URL giữ khoảng ngày mới", async () => {
    // Cùng router với main.tsx: BrowserRouter mặc định cập nhật vị trí trong startTransition.
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <BrowserRouter>
          <WorkoutInsightsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole("option", { name: "Toàn thân" })
    const days7 = screen.getByRole("button", { name: "7 ngày" })
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Template" })

    // Bắn sự kiện thẳng, không qua act: act render xong transition giữa hai lần bấm nên che mất lỗi.
    // Giữa hai sự kiện thật của trình duyệt chỉ chắc chạy được microtask, transition có thể chưa render.
    actEnv.IS_REACT_ACT_ENVIRONMENT = false
    try {
      days7.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      select.value = "t1"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    } finally {
      actEnv.IS_REACT_ACT_ENVIRONMENT = true
    }

    const url = new URLSearchParams(window.location.search)
    expect(url.get("days")).toBe("7")
    expect(url.get("template")).toBe("t1")
  })
})
