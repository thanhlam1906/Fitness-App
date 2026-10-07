/**
 * Người không phải admin gõ tay /admin… thì về Lịch như gõ một đường dẫn không tồn tại — không
 * thấy sidebar quản trị, không gửi request admin nào (doc/design-quan-ly-user-v1.md §6.1).
 * Backend vẫn chặn 403; đây chỉ là để không lộ UI.
 */
export function isAdminPathBlocked(pathname: string, role: string | null): boolean {
  return (pathname === "/admin" || pathname.startsWith("/admin/")) && role !== "ADMIN"
}
