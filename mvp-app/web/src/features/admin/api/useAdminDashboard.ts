import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { AdminDashboard } from "@/features/admin/types"
import type { InsightDays } from "@/features/admin/utils/workoutInsights"

/** Trang Tổng quan. Giữ số cũ trong lúc đổi khoảng ngày để trang không nháy trắng. */
export function useAdminDashboard(days: InsightDays) {
  return useQuery({
    queryKey: ["admin-dashboard", days],
    queryFn: () => api.get<AdminDashboard>(`/admin/dashboard?days=${days}`),
    placeholderData: keepPreviousData,
  })
}
