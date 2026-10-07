import type { AuditAction, UserRole, UserStatus } from "@/features/admin/types"

export const ROLE_LABEL: Record<UserRole, string> = { USER: "Người tập", ADMIN: "Quản trị" }

export const STATUS_LABEL: Record<UserStatus, string> = {
  TRAINING: "Đang tập",
  NOT_STARTED: "Chưa bắt đầu",
  IDLE: "Bỏ dở",
  LOCKED: "Đã khoá",
}

export const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: "Tạo tài khoản",
  LOCK: "Khoá",
  UNLOCK: "Mở khoá",
  CHANGE_ROLE: "Đổi vai trò",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  DELETE: "Xoá tài khoản",
}
