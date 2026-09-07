import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ScheduleResponse } from "./types"

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.get<ScheduleResponse>("/schedule"),
    retry: false, // 404 = chưa có chương trình, không phải lỗi tạm thời — không cần thử lại
  })
}
