import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { PainReportInput, SessionResponse, SetLogInput, SetLogResponse } from "./types"

const sessionStorageKey = (scheduledWorkoutId: string) => `fitness.session.${scheduledWorkoutId}`

/**
 * §5.1 concept-frontend-v1.md: "buổi tập đang dở là dữ liệu server". Chưa có
 * endpoint "tìm session đang mở theo scheduledWorkoutId" ở backend — nhớ
 * sessionId qua localStorage theo scheduledWorkoutId để tab/trình duyệt này
 * mở lại vẫn đúng chỗ đang dở. Máy khác thì chưa resume được, cần thêm API.
 */
export function useWorkoutSession(scheduledWorkoutId: string) {
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem(sessionStorageKey(scheduledWorkoutId)),
  )

  const start = useMutation({
    mutationFn: () => api.post<SessionResponse>("/sessions", { scheduledWorkoutId }),
    onSuccess: (session) => {
      localStorage.setItem(sessionStorageKey(scheduledWorkoutId), session.id)
      setSessionId(session.id)
    },
  })

  useEffect(() => {
    if (!sessionId && start.isIdle) {
      start.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  function clearSession() {
    localStorage.removeItem(sessionStorageKey(scheduledWorkoutId))
    setSessionId(null)
  }

  return { sessionId, isStarting: start.isPending, startError: start.error, clearSession }
}

export function useLogSet(sessionId: string | null) {
  return useMutation({
    mutationFn: (input: SetLogInput) => api.post<SetLogResponse>(`/sessions/${sessionId}/sets`, input),
  })
}

export function useFinishSession(sessionId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (painReports: PainReportInput[]) =>
      api.post<SessionResponse>(`/sessions/${sessionId}/finish`, { painReports }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule"] }),
  })
}
