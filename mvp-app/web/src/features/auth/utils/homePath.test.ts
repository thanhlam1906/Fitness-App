import { expect, it } from "vitest"
import { homePath, landingPath } from "./homePath"

it("admin vào Tổng quan, người tập vào Lịch", () => {
  expect(homePath("ADMIN")).toBe("/admin")
  expect(homePath("USER")).toBe("/schedule")
  expect(homePath(null)).toBe("/schedule")
})

it("không có trang cũ thì về trang đầu của vai trò", () => {
  expect(landingPath(undefined, "ADMIN")).toBe("/admin")
  expect(landingPath(undefined, "USER")).toBe("/schedule")
})

it("quay lại trang cũ khi nó thuộc khu của vai trò vừa đăng nhập", () => {
  expect(landingPath("/admin/users", "ADMIN")).toBe("/admin/users")
  expect(landingPath("/settings", "USER")).toBe("/settings")
})

it("trang cũ của tài khoản khác (đăng xuất rồi đổi vai trò trên cùng tab) bị bỏ", () => {
  expect(landingPath("/settings", "ADMIN")).toBe("/admin")
  expect(landingPath("/admin/users", "USER")).toBe("/schedule")
})

it("'/' không phải đích, vì nó tự chuyển theo vai trò", () => {
  expect(landingPath("/", "ADMIN")).toBe("/admin")
  expect(landingPath("/", "USER")).toBe("/schedule")
})
