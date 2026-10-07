import { expect, it } from "vitest"
import { isAdminPathBlocked } from "./adminGate"

it("người tập gõ /admin… bị chặn, admin thì không", () => {
  expect(isAdminPathBlocked("/admin/users", "USER")).toBe(true)
  expect(isAdminPathBlocked("/admin", "USER")).toBe(true)
  expect(isAdminPathBlocked("/admin/users", null)).toBe(true)
  expect(isAdminPathBlocked("/admin/users", "ADMIN")).toBe(false)
})

it("đường dẫn chỉ bắt đầu bằng chữ admin nhưng không phải khu quản trị thì không chặn", () => {
  expect(isAdminPathBlocked("/administrator", "USER")).toBe(false)
  expect(isAdminPathBlocked("/schedule", "USER")).toBe(false)
})
