/** Trang đầu sau đăng nhập khi không có trang cũ để quay lại. */
export function homePath(role: string | null): string {
  return role === "ADMIN" ? "/admin" : "/schedule"
}

/**
 * Trang đến sau đăng nhập. `from` có thể là trang của tài khoản vừa đăng xuất trên cùng tab (người tập
 * đăng xuất ở /settings, rồi admin đăng nhập): chỉ quay lại khi nó thuộc khu của vai trò này.
 */
export function landingPath(from: string | undefined, role: string | null): string {
  const isAdminPath = from === "/admin" || from?.startsWith("/admin/") === true
  return from && from !== "/" && isAdminPath === (role === "ADMIN") ? from : homePath(role)
}
