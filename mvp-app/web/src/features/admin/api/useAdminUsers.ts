import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { AdminOverview, AdminUserDetail, AdminUserRow } from "@/features/admin/types"

const usersKey = ["admin-users"] as const

/** Dùng chung giữa màn 11 và badge đếm trên sidebar — cùng queryKey nên chỉ một request. */
export function useAdminUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: () => api.get<AdminUserRow[]>("/admin/users"),
  })
}

/** Bốn ô thống kê đầu màn 11, và badge "Góp ý bị báo sai" ở sidebar. */
export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<AdminOverview>("/admin/overview"),
  })
}

/** Hồ sơ một người dùng ở màn 11. */
export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${userId}`),
  })
}
