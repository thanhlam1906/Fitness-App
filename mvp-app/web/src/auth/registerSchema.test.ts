import { describe, expect, it } from "vitest"
import { registerSchema, toRegisterPayload, type RegisterValues } from "./registerSchema"

const valid: RegisterValues = {
  fullName: "Nguyễn Văn A",
  email: "a@vfit.vn",
  phone: "0912 345 678",
  password: "matkhau123",
  confirmPassword: "matkhau123",
  acceptTerms: true,
}

function errorPaths(values: RegisterValues) {
  const r = registerSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."))
}

describe("registerSchema", () => {
  it("form hợp lệ thì qua", () => expect(errorPaths(valid)).toEqual([]))

  it.each(["091234567", "09123456789", "1912345678"])("SĐT sai: %s", (phone) =>
    expect(errorPaths({ ...valid, phone })).toEqual(["phone"]),
  )

  it("SĐT dạng +84 qua", () => expect(errorPaths({ ...valid, phone: "+84912345678" })).toEqual([]))

  it("mật khẩu nhập lại không khớp", () =>
    expect(errorPaths({ ...valid, confirmPassword: "khac12345" })).toEqual(["confirmPassword"]))

  // Form trống: hai chuỗi rỗng "khớp" nhau và luật so khớp bị bỏ qua khi ô khác lỗi,
  // nên ô này cần luật bắt buộc riêng.
  it("bỏ trống cả hai ô mật khẩu thì ô nhập lại vẫn báo lỗi", () =>
    expect(errorPaths({ ...valid, password: "", confirmPassword: "" })).toEqual([
      "password",
      "confirmPassword",
    ]))

  it("chưa tích điều khoản", () =>
    expect(errorPaths({ ...valid, acceptTerms: false })).toEqual(["acceptTerms"]))

  it("payload: SĐT gọn, bỏ ô nhập lại và điều khoản", () =>
    expect(toRegisterPayload(valid)).toEqual({
      email: "a@vfit.vn",
      password: "matkhau123",
      fullName: "Nguyễn Văn A",
      phone: "0912345678",
    }))
})
