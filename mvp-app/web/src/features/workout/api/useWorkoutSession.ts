import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { FinishSessionInput, SessionResponse, SetLogInput, SetLogResponse } from "@/features/workout/types"

const sessionKey = (scheduledWorkoutId: string) => ["session", scheduledWorkoutId] as const

/**
 * §5.1 concept-frontend-v1.md: "buổi tập đang dở là dữ liệu server".
 *
 * POST /sessions là idempotent theo scheduledWorkoutId — buổi đang dở thì
 * backend trả lại chính nó kèm các set đã log, chưa có thì tạo mới. Nên KHÔNG
 * cần nhớ sessionId ở localStorage nữa: đóng tab, đổi máy, khoá màn hình giữa
 * buổi — mở lại vẫn đúng chỗ đang dở.
 *
 * Dùng useQuery với một POST là cố ý: về mặt ngữ nghĩa đây là "lấy buổi tập
 * đang mở", chỉ là backend cần tạo nếu chưa có. Gọi lại không sinh thêm gì.
 */
export function useWorkoutSession(scheduledWorkoutId: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: sessionKey(scheduledWorkoutId),
    queryFn: async () => {
      const session = await api.post<SessionResponse>("/sessions", { scheduledWorkoutId })
      // POST vừa tạo buổi đang dở. Màn Lịch đọc trạng thái này qua hai query dưới và giữ 30 s (staleTime ở
      // main.tsx): không báo thì quay về vẫn thấy nút "Bắt đầu". Lịch chỉ đánh dấu cũ, tải lại khi về màn Lịch.
      queryClient.setQueryData(["session-of-day", scheduledWorkoutId], session)
      queryClient.invalidateQueries({ queryKey: ["schedule"], refetchType: "none" })
      return session
    },
    staleTime: Infinity, // cache đã được ghi lại sau mỗi log set, không cần refetch nền
  })
}

export function useLogSet(scheduledWorkoutId: string, sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetLogInput) => api.post<SetLogResponse>(`/sessions/${sessionId}/sets`, input),
    onSuccess: (saved) => {
      // Ghi thẳng vào cache thay vì invalidate: log set là thao tác liên tục
      // giữa buổi, refetch cả session mỗi lần là thừa.
      queryClient.setQueryData<SessionResponse>(sessionKey(scheduledWorkoutId), (prev) =>
        prev == null
          ? prev
          : {
              ...prev,
              sets: [
                ...prev.sets.filter(
                  (s) => !(s.exerciseId === saved.exerciseId && s.setIndex === saved.setIndex),
                ),
                saved,
              ],
            },
      )
    },
  })
}

export function useFinishSession(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FinishSessionInput) =>
      api.post<SessionResponse>(`/sessions/${sessionId}/finish`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      // Thẻ ngày ở màn Lịch đọc buổi qua ["session-of-day", id]; không làm mới thì vừa kết
      // buổi xong vẫn thấy bản cũ (chưa tập / đang dở) một nhịp.
      queryClient.invalidateQueries({ queryKey: ["session-of-day"] })
      // Tiến bộ ở màn Cài đặt tính từ các buổi đã xong.
      queryClient.invalidateQueries({ queryKey: ["progress"] })
    },
  })
}

export function useSubstitutes(exerciseId: string | null) {
  return useQuery({
    queryKey: ["substitutes", exerciseId],
    queryFn: () =>
      api.get<{ id: string; nameVi: string | null; nameEn: string; equipment: string[] }[]>(
        `/exercises/${exerciseId}/substitutes`,
      ),
    enabled: exerciseId != null,
  })
}

export function useSubstitute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scheduledExerciseId, exerciseId }: { scheduledExerciseId: string; exerciseId: string }) =>
      api.post(`/schedule/exercises/${scheduledExerciseId}/substitute`, { exerciseId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule"] }),
  })
}
