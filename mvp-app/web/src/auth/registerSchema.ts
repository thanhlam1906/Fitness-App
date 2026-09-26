import { z } from "zod"

// Cùng regex với RegisterRequest ở backend.
const PHONE = /^(0|\+84)\d{9}$/

// Người dùng hay gõ "0912 345 678" hoặc "0912.345.678" — bỏ ký tự phân cách trước khi kiểm.
export function normalizePhone(s: string) {
  return s.replace(/[\s.-]/g, "")
}

// Năm sinh, giới tính không hỏi ở đây: thuộc bước BODY của onboarding.
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nhập họ và tên").max(100, "Tối đa 100 ký tự"),
    email: z.email("Email không hợp lệ"),
    phone: z
      .string()
      .refine((s) => PHONE.test(normalizePhone(s)), "Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84"),
    password: z.string().min(8, "Tối thiểu 8 ký tự"),
    confirmPassword: z.string().min(1, "Gõ lại mật khẩu để xác nhận"),
    acceptTerms: z.boolean().refine((v) => v, "Cần đồng ý điều khoản để tạo tài khoản"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  })

export type RegisterValues = z.infer<typeof registerSchema>

export type RegisterPayload = {
  email: string
  password: string
  fullName: string
  phone: string
}

export function toRegisterPayload(v: RegisterValues): RegisterPayload {
  return {
    email: v.email,
    password: v.password,
    fullName: v.fullName.trim(),
    phone: normalizePhone(v.phone),
  }
}
