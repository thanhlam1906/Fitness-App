import { describe, expect, it } from "vitest"
import { formToGuide, guideToForm } from "./filmingGuideForm"

const EMPTY = { distance: "", lighting: "", duration: "", notes: { SAGITTAL: "", FRONTAL: "", DIAGONAL: "" } }

describe("guideToForm", () => {
  it("chưa có hướng dẫn hoặc JSON hỏng thì form trống, không vỡ", () => {
    expect(guideToForm(null)).toEqual(EMPTY)
    expect(guideToForm("{hỏng")).toEqual(EMPTY)
  })

  it("đọc ba câu dặn và lưu ý từng góc", () => {
    const raw = JSON.stringify({
      angles: [{ code: "FRONTAL", label: "Chính diện", why: "kiểm tra gối" }],
      distance: "Cách 3 m",
      lighting: "Đèn trước mặt",
      figure: null,
    })
    expect(guideToForm(raw)).toEqual({
      ...EMPTY,
      distance: "Cách 3 m",
      lighting: "Đèn trước mặt",
      notes: { SAGITTAL: "", FRONTAL: "kiểm tra gối", DIAGONAL: "" },
    })
  })
})

describe("formToGuide", () => {
  it("form trống ra chuỗi rỗng để backend lưu NULL, người tập thấy câu dặn mặc định", () => {
    expect(formToGuide(EMPTY)).toBe("")
    expect(formToGuide({ ...EMPTY, distance: "   " })).toBe("")
  })

  it("chỉ ghi ô có chữ, góc theo thứ tự Ngang → Chính diện → Chéo, kèm tên góc", () => {
    const json = formToGuide({
      ...EMPTY,
      duration: " 3–5 rep ",
      notes: { SAGITTAL: "", FRONTAL: "gối — không chụm", DIAGONAL: "xoay ba phần tư" },
    })
    expect(JSON.parse(json)).toEqual({
      angles: [
        { code: "FRONTAL", label: "Chính diện", why: "gối — không chụm" },
        { code: "DIAGONAL", label: "Chéo 45°", why: "xoay ba phần tư" },
      ],
      duration: "3–5 rep",
    })
  })

  it("khứ hồi giữ nguyên nội dung", () => {
    const form = { distance: "a", lighting: "b", duration: "c", notes: { SAGITTAL: "x", FRONTAL: "y", DIAGONAL: "z" } }
    expect(guideToForm(formToGuide(form))).toEqual(form)
  })
})
