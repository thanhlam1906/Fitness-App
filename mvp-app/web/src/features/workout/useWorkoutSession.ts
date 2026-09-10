import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { FinishSessionInput, SessionResponse, SetLogInput, SetLogResponse } from "./types"

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
  return useQuery({
    queryKey: sessionKey(scheduledWorkoutId),
    queryFn: () => api.post<SessionResponse>("/sessions", { scheduledWorkoutId }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule"] }),
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
