import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExerciseGuideBody } from "./ExerciseGuideBody"

const base = { slug: "push-up", muscleGroups: ["CHEST"], stepsVi: ["Hạ ngực sát sàn."], mistakesVi: ["Võng hông."] }

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

describe("ExerciseGuideBody", () => {
  it("hiện dụng cụ khi có, 'Không cần' khi mảng rỗng, không hiện dòng nào khi không truyền", () => {
    const { rerender } = render(<ExerciseGuideBody {...base} equipment={["CABLE"]} />)
    expect(screen.getByText("Máy cáp")).toBeInTheDocument()

    rerender(<ExerciseGuideBody {...base} equipment={[]} />)
    expect(screen.getByText("Không cần")).toBeInTheDocument()

    rerender(<ExerciseGuideBody {...base} />)
    expect(screen.queryByText(/Dụng cụ/)).not.toBeInTheDocument()
  })

  it("ẩn Lỗi hay gặp khi rỗng", () => {
    const { rerender } = render(<ExerciseGuideBody {...base} />)
    expect(screen.getByText("Lỗi hay gặp")).toBeInTheDocument()

    rerender(<ExerciseGuideBody {...base} mistakesVi={[]} />)
    expect(screen.queryByText("Lỗi hay gặp")).not.toBeInTheDocument()
  })

  it("hiện nhãn cho nhóm cơ mới", () => {
    render(<ExerciseGuideBody {...base} muscleGroups={["CALVES"]} />)
    expect(screen.getByText("Bắp chân")).toBeInTheDocument()
  })

  it("hiện tên và mô tả khi được truyền", () => {
    render(<ExerciseGuideBody {...base} title="Push-up" description="Bài đẩy ngực." />)
    expect(screen.getByText("Push-up")).toBeInTheDocument()
    expect(screen.getByText("Bài đẩy ngực.")).toBeInTheDocument()
  })

  it("ảnh để alt rỗng vì tên bài đã hiện thành chữ ngay bên cạnh", () => {
    const { container } = render(<ExerciseGuideBody {...base} title="Push-up" />)
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
  })

  it("hai dòng cách tập, lỗi hay gặp trùng chữ vẫn hiện đủ, React không báo trùng key", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    render(<ExerciseGuideBody {...base} stepsVi={["Siết bụng.", "Siết bụng."]} mistakesVi={["Võng hông.", "Võng hông."]} />)
    expect(screen.getAllByText("Siết bụng.")).toHaveLength(2)
    expect(screen.getAllByText("Võng hông.")).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
