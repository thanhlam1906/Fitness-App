import { expect, it } from "vitest"
import { changePasswordSchema, isPasswordChangeRequired, newPasswordSchema } from "./passwordSchema"

it("nhận ra lỗi cần đổi mật khẩu theo detail, không theo lớp lỗi (web và mobile có ApiError riêng)", () => {
  expect(isPasswordChangeRequired({ status: 403, detail: "PASSWORD_CHANGE_REQUIRED" })).toBe(true)
  expect(isPasswordChangeRequired({ status: 403, detail: "Tài khoản đã bị khoá. Liên hệ quản trị viên." })).toBe(false)
  expect(isPasswordChangeRequired(new Error("x"))).toBe(false)
  expect(isPasswordChangeRequired(null)).toBe(false)
})

it("mật khẩu mới tối thiểu 8 ký tự và phải gõ lại khớp", () => {
  expect(newPasswordSchema.safeParse({ newPassword: "short", confirmPassword: "short" }).success).toBe(false)
  expect(newPasswordSchema.safeParse({ newPassword: "long-enough", confirmPassword: "khac-nhau" }).success).toBe(false)
  expect(newPasswordSchema.safeParse({ newPassword: "long-enough", confirmPassword: "long-enough" }).success).toBe(true)
})

it("đổi mật khẩu: mật khẩu mới phải khác mật khẩu hiện tại", () => {
  const same = changePasswordSchema.safeParse({
    currentPassword: "long-enough",
    newPassword: "long-enough",
    confirmPassword: "long-enough",
  })
  expect(same.success).toBe(false)
  expect(
    changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "new-pass-2", confirmPassword: "new-pass-2" })
      .success,
  ).toBe(true)
})
