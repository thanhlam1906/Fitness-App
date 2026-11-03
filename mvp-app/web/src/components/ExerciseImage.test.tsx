import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ExerciseImage } from "./ExerciseImage"

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

describe("ExerciseImage trong thẻ bài của trợ lý (inCard)", () => {
  it("ảnh nhỏ chỉ có nền trắng khi nằm trong thẻ, các màn khác giữ nguyên", () => {
    const { container, rerender } = render(<ExerciseImage slug="push-up" alt="" variant="thumb" />)
    expect(container.querySelector("img")).not.toHaveClass("bg-white")

    rerender(<ExerciseImage slug="push-up" alt="" variant="thumb" inCard />)
    expect(container.querySelector("img")).toHaveClass("bg-white")
  })

  it("ảnh lớn vẫn bo góc như cũ, trong thẻ thì vuông để sát mép khung", () => {
    const { container, rerender } = render(<ExerciseImage slug="push-up" alt="" variant="large" />)
    expect(container.firstElementChild).toHaveClass("rounded-[var(--radius-md)]")

    rerender(<ExerciseImage slug="push-up" alt="" variant="large" inCard />)
    expect(container.firstElementChild).not.toHaveClass("rounded-[var(--radius-md)]")
  })
})
