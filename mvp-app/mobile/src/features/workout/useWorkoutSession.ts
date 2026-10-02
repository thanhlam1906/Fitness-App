import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "~/api/client"
import type { FinishSessionInput, SessionResponse, SetLogInput, SetLogResponse } from "@/features/workout/types"

const sessionKey = (scheduledWorkoutId: string) => ["session", scheduledWorkoutId] as const

/**
 * §5.1 concept-frontend-v1.md: "buổi tập đang dở là dữ liệu server".
 *
 * POST /sessions là idempotent theo scheduledWorkoutId — buổi đang dở thì
 * backend trả lại chính nó kèm các set đã log, chưa có thì tạo mới. Nên KHÔNG
 * cần nhớ sessionId trên máy nữa: tắt app, đổi máy, khoá màn hình giữa
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
      // Tab Lịch vẫn dựng sẵn bên dưới và không tự tải lại (khác web): báo ngay buổi đang dở để thẻ
      // hôm nay đổi thành "Tiếp tục" và ẩn "Sửa buổi này" (code-reviewer 10-02 #1).
      queryClient.setQueryData(["session-of-day", scheduledWorkoutId], session)
      void queryClient.invalidateQueries({ queryKey: ["schedule"] })
      return session
    },
    staleTime: Infinity, // cache đã được ghi lại sau mỗi log set, không cần refetch nền
    // 409 = ngày đã tập xong: thử lại vẫn 409, chỉ làm người dùng chờ thêm.
    retry: (count, error) => !(error instanceof ApiError && error.status === 409) && count < 3,
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
    onSuccess: (finished) => {
      // Màn buổi tập đọc trạng thái từ cache này (staleTime Infinity): ghi DONE để không ghi set
      // hay kết buổi lần nữa từ màn cũ (code-reviewer 10-02 #2).
      if (finished.scheduledWorkoutId) queryClient.setQueryData(sessionKey(finished.scheduledWorkoutId), finished)
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      // Thẻ ngày ở màn Lịch đọc buổi qua ["session-of-day", id]; không làm mới thì vừa kết
      // buổi xong vẫn thấy bản cũ (chưa tập / đang dở) một nhịp.
      queryClient.invalidateQueries({ queryKey: ["session-of-day"] })
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
