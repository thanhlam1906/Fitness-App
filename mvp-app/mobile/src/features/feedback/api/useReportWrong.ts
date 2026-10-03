import { useMutation } from "@tanstack/react-query"
import type { FeedbackSource } from "@/features/feedback/types"
import { api } from "~/api/client"

// Như bản web: gửi góp ý "cái này sai" cho đúng một thứ máy sinh ra.
export function useReportWrong(source: FeedbackSource) {
  return useMutation({
    mutationFn: (note: string) => api.post("/feedback", { ...source, isWrong: true, note: note || null }),
  })
}
