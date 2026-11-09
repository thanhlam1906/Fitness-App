import type { AuditAction, UserRole, UserStatus } from "@/features/admin/types"

export const ROLE_LABEL: Record<UserRole, string> = { USER: "Người tập", ADMIN: "Quản trị" }

export const STATUS_LABEL: Record<UserStatus, string> = {
  TRAINING: "Đang tập",
  NOT_STARTED: "Chưa bắt đầu",
  IDLE: "Bỏ dở",
  LOCKED: "Đã khoá",
}

/** Các bước khai hồ sơ lúc mới đăng ký (STEPS của OnboardingPage); "DONE" là đã khai xong. */
export const ONBOARDING_STEP_LABEL: Record<string, string> = {
  DISCLAIMER: "Cam kết",
  BODY: "Số đo",
  GOAL: "Mục tiêu",
  EQUIPMENT: "Thiết bị",
  EXPERIENCE: "Kinh nghiệm",
}

export const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: "Tạo tài khoản",
  LOCK: "Khoá",
  UNLOCK: "Mở khoá",
  CHANGE_ROLE: "Đổi vai trò",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  DELETE: "Xoá tài khoản",
}
