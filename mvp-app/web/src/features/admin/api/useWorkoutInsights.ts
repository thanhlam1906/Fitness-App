import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { WorkoutInsights } from "@/features/admin/types"
import type { InsightDays } from "@/features/admin/utils/workoutInsights"

/** Trang Buổi tập. Giữ số cũ trong lúc đổi bộ lọc để bảng không nháy trắng. */
export function useWorkoutInsights(templateId: string | null, days: InsightDays) {
  const query = new URLSearchParams({ days: String(days) })
  if (templateId) query.set("templateId", templateId)
  return useQuery({
    queryKey: ["admin-workout-insights", templateId, days],
    queryFn: () => api.get<WorkoutInsights>(`/admin/workout-insights?${query}`),
    placeholderData: keepPreviousData,
  })
}
