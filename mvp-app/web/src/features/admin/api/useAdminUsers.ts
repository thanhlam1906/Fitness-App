import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { AdminOverview, AdminPage, AdminUserDetail, AdminUserRow } from "@/features/admin/types"
import { toUsersApiQuery, type UserListParams } from "@/features/admin/utils/userListParams"

const usersKey = ["admin-users"] as const
const overviewKey = ["admin-overview"] as const

/** Một trang danh sách; giữ trang cũ trong lúc tải trang mới để bảng không nháy trống. */
export function useAdminUsers(params: UserListParams) {
  return useQuery({
    queryKey: [...usersKey, params],
    queryFn: () => api.get<AdminPage<AdminUserRow>>(`/admin/users?${toUsersApiQuery(params)}`),
    placeholderData: keepPreviousData,
  })
}

/** Bốn ô thống kê, số trên tab, và badge "Người dùng" / "Góp ý bị báo sai" ở sidebar. */
export function useAdminOverview() {
  return useQuery({ queryKey: overviewKey, queryFn: () => api.get<AdminOverview>("/admin/overview") })
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${userId}`),
    enabled: userId !== undefined,
  })
}

/** Sau mỗi thao tác quản trị: danh sách, số đếm, hồ sơ và nhật ký đều có thể đã đổi. */
export function useInvalidateAdminUsers() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: usersKey }),
      queryClient.invalidateQueries({ queryKey: overviewKey }),
      queryClient.invalidateQueries({ queryKey: ["admin-user"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
    ])
}
