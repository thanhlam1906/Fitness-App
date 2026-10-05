import { describe, expect, it } from "vitest"
import { draftOf, emptyDraft, rangeOf, toInput, validateDraft } from "./formCheckDraft"

const filled = { ...emptyDraft("SAGITTAL"), measure: "knee" as const, to: "100", warn: "15", nameVi: "Ngồi đủ sâu", cueFailVi: "Hạ hông." }

describe("formCheckDraft", () => {
  it("bản nháp mới đo lúc sâu nhất, chưa chọn khớp", () => {
    expect(emptyDraft("FRONTAL")).toMatchObject({ view: "FRONTAL", measure: null, moment: "PEAK", from: "", to: "" })
  })

  it("báo đúng ô còn thiếu hay sai", () => {
    expect(validateDraft(emptyDraft("SAGITTAL"))).toEqual({
      measure: "Chọn một khớp.",
      nameVi: "Cần tên mục.",
      cueFailVi: "Cần câu nhắc khi sai.",
    })
    expect(validateDraft({ ...filled, to: "" }).range).toBe("Nhập ít nhất một số.")
    expect(validateDraft({ ...filled, to: "200" }).range).toBe("Nhập số nguyên từ 0 đến 180.")
    expect(validateDraft({ ...filled, to: "12.5" }).range).toBe("Nhập số nguyên từ 0 đến 180.")
    expect(validateDraft({ ...filled, from: "120" }).range).toBe("Số đầu phải nhỏ hơn số sau.")
    expect(validateDraft({ ...filled, warn: "-1" }).range).toBe("Sát ngưỡng phải là số nguyên từ 0 trở lên.")
    expect(validateDraft(filled)).toEqual({})
  })

  it("đổi sang dữ liệu gửi API, ô trống là null, sát ngưỡng trống là 0", () => {
    expect(toInput({ ...filled, warn: "" })).toEqual({
      view: "SAGITTAL", measure: "knee", moment: "PEAK", from: null, to: 100, warn: 0,
      nameVi: "Ngồi đủ sâu", cueFailVi: "Hạ hông.",
    })
    expect(rangeOf(filled)).toEqual({ from: null, to: 100, warn: 15 })
    expect(rangeOf({ ...filled, to: "abc" })).toBeNull()
  })

  it("mở khớp đã lưu thành bản nháp", () => {
    const d = draftOf({ id: "1", exerciseId: "e", view: "SAGITTAL", measure: "knee", moment: "PEAK", from: 80,
      to: null, warn: 10, nameVi: "A", cueFailVi: "B", priority: 1 })
    expect(d).toMatchObject({ from: "80", to: "", warn: "10", measure: "knee" })
  })
})
