import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  AdminAuditEntry,
  AdminOverview,
  AdminPage,
  AdminUserCreated,
  AdminUserDetail,
  AdminUserRow,
  CreateUserPayload,
  UserRole,
} from "@/features/admin/types"
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

export function useCreateUser() {
  const invalidate = useInvalidateAdminUsers()
  return useMutation({
    mutationFn: (body: CreateUserPayload) => api.post<AdminUserCreated>("/admin/users", body),
    onSuccess: invalidate,
  })
}

export function useSetUserStatus(userId: string) {
  const invalidate = useInvalidateAdminUsers()
  return useMutation({
    mutationFn: (body: { active: boolean; reason: string | null }) =>
      api.patch<AdminUserRow>(`/admin/users/${userId}/status`, body),
    onSuccess: invalidate,
  })
}

export function useChangeUserRole(userId: string) {
  const invalidate = useInvalidateAdminUsers()
  return useMutation({
    mutationFn: (role: UserRole) => api.patch<AdminUserRow>(`/admin/users/${userId}/role`, { role }),
    onSuccess: invalidate,
  })
}

export function useResetUserPassword(userId: string) {
  const invalidate = useInvalidateAdminUsers()
  return useMutation({
    mutationFn: () => api.post<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`, {}),
    onSuccess: invalidate,
  })
}

// Không làm mới hồ sơ và nhật ký của chính người vừa xoá: màn hồ sơ còn mở nên nó sẽ tải lại, nhận 404,
// thử lại 3 lần, và navigate trong onSuccess phải chờ hết (~7 s đứng màn, giống useCorpus.ts).
export function useDeleteUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => api.del<void>(`/admin/users/${userId}`, { reason }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: usersKey }),
        queryClient.invalidateQueries({ queryKey: overviewKey }),
        queryClient.invalidateQueries({ queryKey: ["admin-audit", "all"] }),
      ]),
  })
}

/** targetId undefined = nhật ký toàn hệ thống (trang Nhật ký quản trị). */
export function useAuditLog(targetId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["admin-audit", targetId ?? "all", page],
    queryFn: () =>
      api.get<AdminPage<AdminAuditEntry>>(
        `/admin/audit?page=${page}&size=20${targetId ? `&targetId=${targetId}` : ""}`,
      ),
    placeholderData: keepPreviousData,
  })
}
