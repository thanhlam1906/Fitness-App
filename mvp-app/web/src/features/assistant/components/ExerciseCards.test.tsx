import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ExerciseCards } from "./ExerciseCards"
import type { ExerciseCard } from "@/features/assistant/types"

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

const card = (slug: string, nameEn: string, step: string): ExerciseCard => ({
  slug,
  nameEn,
  muscleGroups: ["CHEST", "TRICEPS"],
  equipment: ["CABLE"],
  stepsVi: [step],
  mistakesVi: [],
})

const three = [card("a", "Bài A", "Bước của A."), card("b", "Bài B", "Bước của B."), card("c", "Bài C", "Bước của C.")]
const expanded = () => screen.getAllByRole("button").map((b) => b.getAttribute("aria-expanded"))

describe("ExerciseCards", () => {
  it("không có thẻ thì không vẽ gì (tin cũ lưu trước khi có thẻ không có trường exercises)", () => {
    const { container, rerender } = render(<ExerciseCards />)
    expect(container).toBeEmptyDOMElement()

    rerender(<ExerciseCards cards={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("một thẻ hiện đầy đủ, không có hàng gọn", () => {
    render(<ExerciseCards cards={[card("push-up", "Push-up", "Hạ ngực sát sàn.")]} />)
    expect(screen.getByText("Push-up")).toBeInTheDocument()
    expect(screen.getByText("Hạ ngực sát sàn.")).toBeInTheDocument()
    expect(screen.getByText("Máy cáp")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("nhiều thẻ: bài đầu mở sẵn, bấm hàng khác thì đóng hàng đang mở, bấm lại hàng đang mở thì đóng", () => {
    render(<ExerciseCards cards={three} />)
    expect(expanded()).toEqual(["true", "false", "false"])
    // Chỉ hàng mở dựng thân bài: ba thẻ dài mở cùng lúc đẩy cuộc trò chuyện đi quá xa.
    expect(screen.getByText("Bước của A.")).toBeInTheDocument()
    expect(screen.queryByText("Bước của B.")).not.toBeInTheDocument()

    const rows = screen.getAllByRole("button")
    fireEvent.click(rows[1])
    expect(expanded()).toEqual(["false", "true", "false"])
    expect(screen.queryByText("Bước của A.")).not.toBeInTheDocument()
    expect(screen.getByText("Bước của B.")).toBeInTheDocument()

    fireEvent.click(rows[1])
    expect(expanded()).toEqual(["false", "false", "false"])
  })

  it("hàng gọn ghi 'cơ chính · dụng cụ' bằng tiếng Việt", () => {
    render(<ExerciseCards cards={three} />)
    expect(screen.getAllByText("Ngực · Máy cáp")).toHaveLength(3)
  })
})
