import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LoadDeltaBadge } from "./LoadDeltaBadge"

/** §6 concept-frontend-v1.md — bắt buộc: render đúng cho UP / HOLD / DOWN. */
describe("LoadDeltaBadge", () => {
  it("tải tăng hiện dấu + và số kg", () => {
    render(
      <LoadDeltaBadge
        decision={{ id: "1", direction: "UP", deltaKg: 2.5, messageVi: "Đủ rep mọi set → +2.5 kg" }}
      />,
    )
    expect(screen.getByText("+2,5 kg")).toBeInTheDocument()
  })

  it("tải giảm hiện dấu trừ, không phải dấu cộng", () => {
    render(
      <LoadDeltaBadge
        decision={{ id: "2", direction: "DOWN", deltaKg: -2.5, messageVi: "Trượt rep 2 tuần → −2.5 kg" }}
      />,
    )
    expect(screen.getByText("−2,5 kg")).toBeInTheDocument()
  })

  it("giữ tải hiện chữ, không hiện 0 kg", () => {
    render(
      <LoadDeltaBadge decision={{ id: "3", direction: "HOLD", deltaKg: 0, messageVi: "Giữ tải" }} />,
    )
    expect(screen.getByText("giữ tải")).toBeInTheDocument()
  })

  it("lý do rule nằm trong title để đọc được khi hover", () => {
    render(
      <LoadDeltaBadge
        decision={{ id: "4", direction: "UP", deltaKg: 2.5, messageVi: "Đủ rep mọi set tuần trước" }}
      />,
    )
    expect(screen.getByTitle("Đủ rep mọi set tuần trước")).toBeInTheDocument()
  })
})
