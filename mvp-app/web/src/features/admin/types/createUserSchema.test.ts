import { expect, it } from "vitest"
import { createUserSchema, toCreateUserPayload } from "./createUserSchema"

const base = { fullName: " Lê Văn C ", email: "c@example.com", phone: "", role: "USER" as const }

it("SĐT để trống thì gửi null; có thì bỏ dấu cách, dấu chấm như form đăng ký", () => {
  expect(toCreateUserPayload(createUserSchema.parse(base))).toEqual({
    fullName: "Lê Văn C",
    email: "c@example.com",
    phone: null,
    role: "USER",
  })
  expect(toCreateUserPayload(createUserSchema.parse({ ...base, phone: "0912 345.678" })).phone).toBe("0912345678")
})

it("SĐT sai, tên quá ngắn, email sai bị chặn", () => {
  expect(createUserSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false)
  expect(createUserSchema.safeParse({ ...base, fullName: " A " }).success).toBe(false)
  expect(createUserSchema.safeParse({ ...base, email: "khong-phai-email" }).success).toBe(false)
})
