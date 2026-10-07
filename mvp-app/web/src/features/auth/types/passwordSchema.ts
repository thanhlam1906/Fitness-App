import { z } from "zod"

/** Backend (AuthService) trả chuỗi này khi đăng nhập bằng mật khẩu tạm — không cấp token. */
export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED"

// So theo field `detail` thay vì instanceof: web và mobile mỗi bên có lớp ApiError riêng.
export function isPasswordChangeRequired(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { detail?: unknown }).detail === PASSWORD_CHANGE_REQUIRED
}

const newPassword = z.string().min(8, "Tối thiểu 8 ký tự")
const confirmPassword = z.string().min(1, "Gõ lại mật khẩu để xác nhận")
const matches = (v: { newPassword: string; confirmPassword: string }) => v.newPassword === v.confirmPassword
const mismatch = { message: "Mật khẩu nhập lại không khớp", path: ["confirmPassword"] }

/** Bước "Đặt mật khẩu mới" sau khi đăng nhập bằng mật khẩu tạm. Luật giống đăng ký (registerSchema). */
export const newPasswordSchema = z.object({ newPassword, confirmPassword }).refine(matches, mismatch)
export type NewPasswordValues = z.infer<typeof newPasswordSchema>

/** Cài đặt › Đổi mật khẩu. */
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"), newPassword, confirmPassword })
  .refine(matches, mismatch)
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
