import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Exercise } from "@/features/exercise/types"
import { ExercisePicker } from "./ExercisePicker"

// vitest chạy globals: false nên testing-library không tự dọn DOM giữa các test.
afterEach(cleanup)

const make = (i: number, nameEn = `exercise ${String(i).padStart(3, "0")}`) =>
  ({ id: `id-${i}`, slug: `bai-${i}`, nameEn, nameVi: null, muscleGroups: ["CHEST"], equipment: [] }) as unknown as Exercise

describe("ExercisePicker", () => {
  it("thư viện dài: chỉ vẽ 50 bài và nói còn bao nhiêu", () => {
    const many = Array.from({ length: 1328 }, (_, i) => make(i))
    render(<ExercisePicker exercises={many} onPick={vi.fn()} />)
    expect(screen.getAllByRole("button", { name: /exercise/ })).toHaveLength(50)
    expect(screen.getByText("Hiện 50 trong 1.328 bài. Gõ tên hoặc chọn nhóm cơ để thu hẹp.")).toBeInTheDocument()
  })

  it("gõ thu hẹp còn ít bài thì hiện hết, không còn câu đếm", () => {
    const many = [...Array.from({ length: 80 }, (_, i) => make(i)), make(900, "Barbell Back Squat")]
    render(<ExercisePicker exercises={many} onPick={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Tìm bài"), { target: { value: "squat barbell" } })
    expect(screen.getAllByRole("button", { name: /Squat/ })).toHaveLength(1)
    expect(screen.queryByText(/Gõ tên hoặc chọn nhóm cơ/)).not.toBeInTheDocument()
  })
})
