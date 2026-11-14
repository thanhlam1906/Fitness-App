import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Exercise } from "@/features/exercise/types"
import { ExerciseCombobox } from "./ExerciseCombobox"

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

const ex = (slug: string, nameEn: string, active = true) =>
  ({ id: slug, slug, nameEn, nameVi: null, active, muscleGroups: ["QUADS"], equipment: ["BARBELL"] }) as unknown as Exercise

const catalog = [
  ex("barbell-back-squat", "Barbell Back Squat"),
  ex("goblet-squat", "Goblet Squat"),
  ex("squat-jump", "Squat jump"),
  ex("bench-press", "Bench Press"),
  ex("overhead-press", "Overhead Press", false),
  ...Array.from({ length: 20 }, (_, i) => ex(`squat-${i}`, `zz squat variant ${String(i).padStart(2, "0")}`)),
]

function setup(value = "") {
  const onChange = vi.fn()
  render(<ExerciseCombobox catalog={catalog} value={value} onChange={onChange} label="Bài thứ 1" />)
  return { onChange, input: screen.getByRole("combobox", { name: "Bài thứ 1" }) }
}

describe("ExerciseCombobox", () => {
  it("gõ tên thì gợi ý tối đa 8 bài khớp nhất, kèm số bài còn lại", () => {
    const { input } = setup()
    fireEvent.change(input, { target: { value: "squat" } })
    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(8)
    // Bài tên bắt đầu bằng "squat" đứng đầu.
    expect(options[0]).toHaveTextContent("Squat jump")
    expect(screen.getByText("Còn 15 bài khớp, gõ thêm để thu hẹp")).toBeInTheDocument()
  })

  it("bấm chọn một bài thì trả slug, ô hiện tên bài", () => {
    const { input, onChange } = setup()
    fireEvent.change(input, { target: { value: "goblet" } })
    fireEvent.click(screen.getByRole("option", { name: /Goblet Squat/ }))
    expect(onChange).toHaveBeenCalledWith("goblet-squat")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("mũi tên xuống rồi Enter chọn bài thứ hai, Enter không gửi form", () => {
    const { input, onChange } = setup()
    fireEvent.change(input, { target: { value: "squat" } })
    fireEvent.keyDown(input, { key: "ArrowDown" })
    const enter = fireEvent.keyDown(input, { key: "Enter" })
    expect(enter).toBe(false) // preventDefault: không bấm nhầm Lưu template
    expect(onChange).toHaveBeenCalledWith("barbell-back-squat")
  })

  it("Esc đóng gợi ý, giữ bài cũ, không gọi onChange", () => {
    const { input, onChange } = setup("bench-press")
    expect(input).toHaveValue("Bench Press")
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "squ" } })
    fireEvent.keyDown(input, { key: "Escape" })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(input).toHaveValue("Bench Press")
  })

  it("focus rồi Enter mà chưa gõ gì thì giữ bài cũ, không thay bằng bài đầu bảng chữ cái", () => {
    const { input, onChange } = setup("bench-press")
    fireEvent.focus(input)
    const enter = fireEvent.keyDown(input, { key: "Enter" })
    expect(enter).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue("Bench Press")
  })

  it("Enter khi gợi ý đã đóng cũng không gửi form", () => {
    const { input } = setup("bench-press")
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false)
  })

  it("chọn xong vẫn focus, bấm lại vào ô thì mở gợi ý với ô trống, không nối chữ vào tên cũ", () => {
    const { input } = setup("bench-press")
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "goblet" } })
    fireEvent.click(screen.getByRole("option", { name: /Goblet Squat/ }))
    fireEvent.click(input)
    expect(input).toHaveValue("")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("gợi ý đã đóng mà gõ tiếp: chỉ lấy phần mới gõ; bôi đen gõ đè thì lấy nguyên chữ mới", () => {
    const { input } = setup("bench-press")
    fireEvent.change(input, { target: { value: "Bench Pressgob" } })
    expect(input).toHaveValue("gob")
    fireEvent.keyDown(input, { key: "Escape" })
    fireEvent.change(input, { target: { value: "squ" } })
    expect(input).toHaveValue("squ")
  })

  it("không có bài khớp: báo bằng vùng thông báo, không đặt dòng lạ trong listbox", () => {
    const { input } = setup()
    fireEvent.change(input, { target: { value: "khongcobainay" } })
    expect(screen.getByRole("status")).toHaveTextContent("Không có bài nào khớp.")
    expect(screen.getByRole("listbox").querySelectorAll(":scope > :not([role=option])")).toHaveLength(0)
  })

  it("bài đã tắt vẫn hiện ở dòng đang dùng nó, nhưng không có trong gợi ý", () => {
    const { input } = setup("overhead-press")
    expect(input).toHaveValue("Overhead Press (đã tắt)")
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "overhead" } })
    expect(screen.queryByRole("option", { name: /Overhead Press/ })).not.toBeInTheDocument()
  })
})
