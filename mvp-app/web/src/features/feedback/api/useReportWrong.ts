import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { FeedbackSource } from "@/features/feedback/types"

export function useReportWrong(source: FeedbackSource) {
  return useMutation({
    mutationFn: (note: string) => api.post("/feedback", { ...source, isWrong: true, note: note || null }),
  })
}
