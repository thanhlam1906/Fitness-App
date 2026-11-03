import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Exercise } from "@/features/exercise/types"
import { ExerciseListPanel } from "./ExerciseListPanel"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

const exercise = (nameEn: string, state: "ACTIVE" | "DRAFT" | "DELETED"): Exercise => ({
  id: nameEn,
  slug: nameEn,
  nameEn,
  nameVi: null,
  muscleGroups: ["QUADS"],
  equipment: [],
  description: null,
  filmingGuide: null,
  analyzable: false,
  active: state === "ACTIVE",
  draft: state === "DRAFT",
  stepsVi: [],
  mistakesVi: [],
  formCheckCount: 0,
  checkViews: [],
  hasStillImage: true,
  hasAnimatedImage: false,
  updatedAt: "2026-10-10T00:00:00Z",
})

beforeEach(() => {
  api.get.mockResolvedValue([exercise("Squat", "ACTIVE"), exercise("Calf Raise", "DRAFT"), exercise("Old Press", "DELETED")])
})

afterEach(cleanup)

function renderPanel() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ExerciseListPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("ExerciseListPanel: bài chưa duyệt và đã xoá", () => {
  it("bài chưa duyệt có nhãn Chưa duyệt, không bị gọi là đã tắt; chỉ bài đã xoá mới đã tắt", async () => {
    renderPanel()
    const draftRow = (await screen.findByText("Calf Raise")).closest("a")!
    expect(draftRow).toHaveTextContent("Chưa duyệt")
    expect(draftRow).not.toHaveTextContent("đã tắt")
    expect(screen.getByText("Old Press").closest("a")).toHaveTextContent("đã tắt")
    expect(screen.getByText("Squat").closest("a")).not.toHaveTextContent(/Chưa duyệt|đã tắt/)
  })

  it("lọc Chưa duyệt chỉ còn bài chưa duyệt; lọc Đã xoá chỉ còn bài đã xoá", async () => {
    renderPanel()
    await screen.findByText("Calf Raise")

    fireEvent.click(screen.getByRole("button", { name: "Chưa duyệt 1" }))
    expect(screen.getByText("Calf Raise")).toBeInTheDocument()
    expect(screen.queryByText("Squat")).not.toBeInTheDocument()
    expect(screen.queryByText("Old Press")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Đã xoá 1" }))
    expect(screen.getByText("Old Press")).toBeInTheDocument()
    expect(screen.queryByText("Squat")).not.toBeInTheDocument()
    expect(screen.queryByText("Calf Raise")).not.toBeInTheDocument()
  })
})
