import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { SocialButtons } from "./AuthLayout"
import { AuthProvider } from "./AuthContext"
import { api } from "@/api/client"

vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api: { get: vi.fn(), post: vi.fn() },
}))
// Không nạp SDK thật từ Google/Facebook trong test.
vi.mock("@/features/auth/utils/socialSdk", () => ({
  loadSocialSdk: vi.fn(() => Promise.resolve()),
  getGoogleAccessToken: vi.fn(),
  getFacebookAccessToken: vi.fn(),
}))

// jsdom ở cấu hình này không dựng được localStorage thật (xem api/client.test.ts).
beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderButtons() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <SocialButtons />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it("server chưa cấu hình: cả hai nút khoá kèm Sắp có", async () => {
  vi.mocked(api.get).mockResolvedValue({ googleClientId: null, facebookAppId: null })
  renderButtons()

  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/auth/social-config"))
  expect(screen.getByRole("button", { name: /Google/ })).toBeDisabled()
  expect(screen.getByRole("button", { name: /Facebook/ })).toBeDisabled()
  expect(screen.getAllByText("Sắp có")).toHaveLength(2)
})

it("chỉ có Google: nút Google bấm được, Facebook vẫn Sắp có", async () => {
  vi.mocked(api.get).mockResolvedValue({ googleClientId: "gid", facebookAppId: null })
  renderButtons()

  await waitFor(() => expect(screen.getByRole("button", { name: /Google/ })).toBeEnabled())
  expect(screen.getByRole("button", { name: /Facebook/ })).toBeDisabled()
  expect(screen.getAllByText("Sắp có")).toHaveLength(1)
})
