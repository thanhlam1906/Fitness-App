import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDiscardUpload, useDocument, usePublishUpload, useRemoveDocument, useUpload } from "./useCorpus"

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), postForm: vi.fn() }))
vi.mock("@/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/client")>()),
  api,
}))

function wrapper() {
  const client = new QueryClient()
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const calls = (path: string) => api.get.mock.calls.filter(([p]) => p === path).length

// Màn chi tiết vẫn đang mở lúc bấm nút. Làm mới cả query chi tiết của thứ vừa xoá thì nó tải lại, nhận
// 404, thử lại 3 lần, và navigate phải chờ hết (~7 s đứng màn, ui-verifier 10-03).
describe("sau khi bỏ/đưa vào/gỡ không tải lại chi tiết của chính thứ vừa đi khỏi", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.get.mockImplementation((path: string) => Promise.resolve(path.endsWith("s") ? [] : { id: "x", status: "READY" }))
    api.del.mockResolvedValue(undefined)
    api.post.mockResolvedValue({ documentId: "d1", chunkCount: 2 })
  })

  it("Bỏ file chờ duyệt", async () => {
    const { result } = renderHook(() => ({ detail: useUpload("u1"), discard: useDiscardUpload() }), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true))

    await act(() => result.current.discard.mutateAsync("u1"))

    expect(calls("/admin/corpus/uploads/u1")).toBe(1)
  })

  it("Đưa vào trợ lý", async () => {
    const { result } = renderHook(() => ({ detail: useUpload("u1"), publish: usePublishUpload() }), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true))

    await act(() => result.current.publish.mutateAsync({ id: "u1", title: "Bài 4" }))

    expect(calls("/admin/corpus/uploads/u1")).toBe(1)
  })

  it("Gỡ tài liệu trong kho", async () => {
    const { result } = renderHook(() => ({ detail: useDocument("d1"), remove: useRemoveDocument() }), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true))

    await act(() => result.current.remove.mutateAsync("d1"))

    expect(calls("/admin/corpus/documents/d1")).toBe(1)
  })
})
