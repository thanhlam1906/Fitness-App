/**
 * Đăng nhập lại mà onboarding còn dở thì đưa thẳng về bước đang dở, thay vì để người
 * dùng vào Lịch trống rồi tự mò tới nút "Hoàn tất hồ sơ". Bước cụ thể do màn
 * onboarding đọc từ `profiles.onboarding_step`.
 */
export function shouldResumeOnboarding(
  role: string | null,
  onboardingStep: string | undefined,
  pathname: string,
): boolean {
  // HLV dùng trang quản trị, không có hồ sơ tập.
  if (role === "ADMIN") return false
  // Chưa biết bước (đang tải, lỗi mạng) thì không chặn — lỗi hồ sơ không được khoá cả app.
  if (onboardingStep === undefined) return false
  return onboardingStep !== "DONE" && pathname !== "/onboarding"
}
