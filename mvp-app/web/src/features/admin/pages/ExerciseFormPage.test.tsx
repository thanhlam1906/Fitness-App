import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Link, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Exercise } from "@/features/exercise/types"
import { ExerciseFormPage } from "./ExerciseFormPage"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), postForm: vi.fn(), del: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

// Cột trái thật gọi GET /exercises; test chỉ cần chỗ bấm để đổi bài.
vi.mock("@/features/admin/components/ExerciseListPanel", () => ({
  ExerciseListPanel: () => <Link to="/admin/exercises/b?tab=info">sang bài B</Link>,
}))

// Tạo xong trang mở ở tab "Cách chấm form", không liên quan tới thứ đang kiểm.
vi.mock("@/features/admin/components/FormCheckEditor", () => ({ FormCheckEditor: () => null }))

const exercise = (id: string): Exercise => ({
  id,
  slug: id,
  nameEn: `Bài ${id}`,
  nameVi: null,
  muscleGroups: [],
  equipment: [],
  description: null,
  filmingGuide: null,
  analyzable: false,
  active: true,
  formCheckCount: 0,
  checkViews: [],
  hasStillImage: false,
  hasAnimatedImage: false,
  updatedAt: "2026-10-10T00:00:00Z",
})

beforeEach(() => {
  vi.resetAllMocks()
  URL.createObjectURL = vi.fn(() => "blob:xem-truoc")
  URL.revokeObjectURL = vi.fn()
  api.get.mockImplementation((path: string) => Promise.resolve(exercise(path.split("/").pop()!)))
  api.put.mockResolvedValue(exercise("a"))
})

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/exercises/:id" element={<ExerciseFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("ExerciseFormPage: lưu xong khi đã sang bài khác", () => {
  it("upload ảnh của bài A xong sau khi mở bài B thì không xoá chữ đang gõ ở B, không hiện trạng thái lưu của A", async () => {
    let finishUpload!: () => void
    api.postForm.mockReturnValue(new Promise<void>((resolve) => (finishUpload = resolve)))
    renderAt("/admin/exercises/a?tab=info")
    await screen.findByDisplayValue("Bài a")

    fireEvent.change(screen.getAllByLabelText(/Chọn ảnh/)[0], {
      target: { files: [new File(["x"], "anh.png", { type: "image/png" })] },
    })
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }))
    await waitFor(() => expect(api.postForm).toHaveBeenCalled())

    fireEvent.click(screen.getByText("sang bài B"))
    const nameEn = await screen.findByDisplayValue("Bài b")
    fireEvent.change(nameEn, { target: { value: "đang gõ dở" } })
    // Ảnh của A còn đang lên mà nút của B đã dùng được.
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled()

    finishUpload()
    await waitFor(() => expect(api.postForm).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByDisplayValue("đang gõ dở")).toBeInTheDocument()
    expect(screen.queryByText(/Đã lưu/)).not.toBeInTheDocument()
  })
})

describe("ExerciseFormPage: tạo bài mới", () => {
  it("tạo xong mở trang bài vừa tạo vẫn hiện Đã lưu", async () => {
    api.post.mockResolvedValue(exercise("c"))
    renderAt("/admin/exercises/new")
    fireEvent.change(await screen.findByLabelText("slug"), { target: { value: "c" } })
    fireEvent.change(screen.getByLabelText("Tên (EN)"), { target: { value: "Bài c" } })
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài" }))

    // Header đã đổi sang tên bài vừa tạo (trang /admin/exercises/c) mà chữ Đã lưu không bị xoá theo.
    expect(await screen.findByText("Bài c")).toBeInTheDocument()
    expect(screen.getByText("Đã lưu — không cần tải lại")).toBeInTheDocument()
  })
})
