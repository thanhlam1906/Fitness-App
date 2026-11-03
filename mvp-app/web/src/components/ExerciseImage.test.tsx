import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ExerciseImage } from "./ExerciseImage"

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

describe("ExerciseImage trong thẻ bài của trợ lý (inCard)", () => {
  it("ảnh nhỏ trong thẻ hiện trọn ảnh trên nền trắng, các màn khác giữ nguyên cắt đầy khung", () => {
    const { container, rerender } = render(<ExerciseImage slug="push-up" alt="" variant="thumb" />)
    expect(container.querySelector("img")).toHaveClass("object-cover")
    expect(container.querySelector("img")).not.toHaveClass("bg-white")
    expect(container.querySelector("img")).not.toHaveClass("object-contain")

    rerender(<ExerciseImage slug="push-up" alt="" variant="thumb" inCard />)
    expect(container.querySelector("img")).toHaveClass("bg-white", "object-contain")
    expect(container.querySelector("img")).not.toHaveClass("object-cover")
  })

  it("ảnh lớn vẫn bo góc và 240px như cũ, trong thẻ thì vuông sát mép khung và 180px (đúng cỡ GIF gốc)", () => {
    const { container, rerender } = render(<ExerciseImage slug="push-up" alt="" variant="large" />)
    expect(container.firstElementChild).toHaveClass("rounded-[var(--radius-md)]")
    expect(container.querySelector("img")).toHaveClass("size-60")

    rerender(<ExerciseImage slug="push-up" alt="" variant="large" inCard />)
    expect(container.firstElementChild).not.toHaveClass("rounded-[var(--radius-md)]")
    // GIF gốc 180x180: phóng lên 240px thì mờ.
    expect(container.querySelector("img")).toHaveClass("size-45")
    expect(container.querySelector("img")).not.toHaveClass("size-60")
  })
})
