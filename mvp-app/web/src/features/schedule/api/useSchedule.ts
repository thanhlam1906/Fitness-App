import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { api, ApiError } from "@/api/client"
import type { SessionResponse } from "@/features/workout/types"
import type { ScheduleResponse } from "@/features/schedule/types"

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.get<ScheduleResponse>("/schedule"),
    retry: false, // 404 = chưa có chương trình, không phải lỗi tạm thời — không cần thử lại
  })
}

/**
 * Buổi đã log của một ngày: xem lại buổi đã tập, hoặc biết buổi hôm nay đang dở
 * để đổi nút thành "Tiếp tục". 404 nghĩa là ngày đó chưa tập — không phải lỗi.
 */
export function useSessionOfDay(scheduledWorkoutId: string | null) {
  return useQuery({
    queryKey: ["session-of-day", scheduledWorkoutId],
    queryFn: async () => {
      try {
        return await api.get<SessionResponse>(`/sessions?scheduledWorkoutId=${scheduledWorkoutId}`)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    enabled: scheduledWorkoutId !== null,
    retry: false,
  })
}

/**
 * Tạo chương trình xong thì vào thẳng Lịch, chọn sẵn buổi đầu tiên — thay cho màn
 * "Xong" chỉ có một câu và một nút. Lấy lịch mới từ server vì lịch vừa sinh lại.
 */
export function useOpenFirstWorkout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    try {
      const schedule = await queryClient.fetchQuery({
        queryKey: ["schedule"],
        queryFn: () => api.get<ScheduleResponse>("/schedule"),
      })
      const first = schedule.workouts.map((w) => w.scheduledOn).sort()[0]
      navigate(first ? `/schedule?ngay=${first}` : "/schedule", { replace: true })
    } catch {
      // Chương trình đã tạo xong; chỉ lấy lịch lỗi thì vẫn vào Lịch, màn đó tự báo lỗi và cho thử lại.
      navigate("/schedule", { replace: true })
    }
  }
}
