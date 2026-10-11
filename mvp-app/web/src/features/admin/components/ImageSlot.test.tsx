import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ImageSlot } from "./ImageSlot"

// jsdom không có URL.createObjectURL.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:xem-truoc")
  URL.revokeObjectURL = vi.fn()
})

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

const png = new File(["x"], "anh.png", { type: "image/png" })

describe("ImageSlot", () => {
  it("ô trống: chọn file đúng loại thì đưa lên bản nháp", () => {
    const onDraft = vi.fn()
    render(<ImageSlot kind="still" savedUrl={null} draft={null} onDraft={onDraft} />)
    expect(screen.getByText("Chưa có")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Chọn ảnh/), { target: { files: [png] } })
    expect(onDraft).toHaveBeenCalledWith(png)
  })

  it("file sai loại thì báo ngay, không đưa vào bản nháp", () => {
    const onDraft = vi.fn()
    render(<ImageSlot kind="still" savedUrl={null} draft={null} onDraft={onDraft} />)
    const gif = new File(["x"], "dong.gif", { type: "image/gif" })
    fireEvent.change(screen.getByLabelText(/Chọn ảnh/), { target: { files: [gif] } })
    expect(onDraft).not.toHaveBeenCalled()
    expect(screen.getByText("Ảnh tĩnh chỉ nhận JPG, PNG hoặc WebP.")).toBeInTheDocument()
  })

  it("ảnh vừa chọn có nhãn Chưa lưu", () => {
    render(<ImageSlot kind="still" savedUrl={null} draft={png} onDraft={vi.fn()} />)
    expect(screen.getByText("Chưa lưu")).toBeInTheDocument()
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:xem-truoc")
  })

  it("xoá ảnh đã lưu thì chờ bấm Lưu, giữ lại được", () => {
    const onDraft = vi.fn()
    const { rerender } = render(<ImageSlot kind="animated" savedUrl="/a.gif" draft={null} onDraft={onDraft} />)
    fireEvent.click(screen.getByRole("button", { name: "Xoá" }))
    expect(onDraft).toHaveBeenCalledWith("remove")

    rerender(<ImageSlot kind="animated" savedUrl="/a.gif" draft="remove" onDraft={onDraft} />)
    expect(screen.getByText("Ảnh sẽ bị xoá khi bấm Lưu.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Giữ lại ảnh cũ" }))
    expect(onDraft).toHaveBeenLastCalledWith(null)
  })

  it("xoá ảnh vừa chọn mà chưa lưu thì chỉ bỏ chọn", () => {
    const onDraft = vi.fn()
    render(<ImageSlot kind="still" savedUrl={null} draft={png} onDraft={onDraft} />)
    fireEvent.click(screen.getByRole("button", { name: "Xoá" }))
    expect(onDraft).toHaveBeenCalledWith(null)
  })
})
