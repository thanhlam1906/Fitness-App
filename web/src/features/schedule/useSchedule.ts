import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ScheduleResponse } from "./types"

export function useSchedule(userId: string) {
  return useQuery({
    queryKey: ["schedule", userId],
    queryFn: () => api.get<ScheduleResponse>(`/schedule?userId=${userId}`),
    retry: false, // 404 = chưa có chương trình, không phải lỗi tạm thời — không cần thử lại
  })
}
