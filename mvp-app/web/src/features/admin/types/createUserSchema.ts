import { z } from "zod"
import type { CreateUserPayload } from "@/features/admin/types"
import { normalizePhone } from "@/features/auth/types/registerSchema"

// Cùng regex với RegisterRequest / AdminUserCreateRequest ở backend.
const PHONE = /^(0|\+84)\d{9}$/

/** Admin tạo tài khoản: SĐT không bắt buộc; mật khẩu do hệ thống sinh, không nhập ở đây. */
export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Nhập họ và tên").max(100, "Tối đa 100 ký tự"),
  email: z.email("Email không hợp lệ"),
  phone: z
    .string()
    .refine((s) => s.trim() === "" || PHONE.test(normalizePhone(s)), "Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84"),
  role: z.enum(["USER", "ADMIN"]),
})
export type CreateUserValues = z.infer<typeof createUserSchema>

export function toCreateUserPayload(v: CreateUserValues): CreateUserPayload {
  const phone = normalizePhone(v.phone)
  return { fullName: v.fullName.trim(), email: v.email, phone: phone === "" ? null : phone, role: v.role }
}
