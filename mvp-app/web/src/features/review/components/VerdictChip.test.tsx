import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VerdictChip } from "./VerdictChip"

/** §6 concept-frontend-v1.md — bắt buộc: render đúng cho từng verdict. */
describe("VerdictChip", () => {
  it("PASS kèm dấu tick, không chỉ dựa vào màu", () => {
    render(<VerdictChip verdict="PASS" />)
    expect(screen.getByText("Đạt ✓")).toBeInTheDocument()
  })

  it("FAIL nói rõ không đạt, kèm dấu ✕", () => {
    render(<VerdictChip verdict="FAIL" />)
    expect(screen.getByText("Không đạt ✕")).toBeInTheDocument()
  })

  it("LOW_CONFIDENCE và NOT_APPLICABLE là hai chữ khác nhau", () => {
    const { unmount } = render(<VerdictChip verdict="LOW_CONFIDENCE" />)
    expect(screen.getByText("Chưa đủ tin cậy")).toBeInTheDocument()
    unmount()

    render(<VerdictChip verdict="NOT_APPLICABLE" />)
    // Gộp hai cái này thành một chữ là vứt đi thông tin giúp người dùng sửa.
    expect(screen.getByText("Sai góc quay")).toBeInTheDocument()
  })

  it("verdict lạ vẫn hiện chữ thô, không render rỗng", () => {
    render(<VerdictChip verdict="SOMETHING_NEW" />)
    expect(screen.getByText("SOMETHING_NEW")).toBeInTheDocument()
  })
})
