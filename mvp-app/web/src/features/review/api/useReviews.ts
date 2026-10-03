import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { CaptureView, FrameJson } from "@/features/review/utils/livePose"
import type { Exercise, Review } from "@/features/review/types"

const IN_FLIGHT: Review["status"][] = ["PENDING", "PROCESSING"]

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.get<Review[]>("/reviews"),
    // Analyzer chấm mất vài giây tới vài chục giây. Poll khi còn việc đang chạy,
    // đứng yên khi xong — không có websocket, và cũng chưa cần.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => IN_FLIGHT.includes(r.status)) ? 5000 : false,
  })
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => api.get<Review>(`/reviews/${id}`),
    refetchInterval: (query) =>
      query.state.data && IN_FLIGHT.includes(query.state.data.status) ? 3000 : false,
  })
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: () => api.get<Exercise>(`/exercises/${id}`),
  })
}

/**
 * C4 — opt-in gửi clip nằm ở màn hướng dẫn quay, không ở nơi khác. Backend từ
 * chối nếu thiếu, nên không có đường nào gửi clip mà chưa đồng ý.
 */
export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      exerciseId,
      files,
      viewpoints,
    }: {
      exerciseId: string
      files: File[]
      viewpoints: string[]
    }) => {
      const form = new FormData()
      files.forEach((file) => form.append("clips", file))
      const query = new URLSearchParams({ exerciseId, optIn: "true" })
      viewpoints.forEach((v) => query.append("viewpoints", v))
      return api.postForm<Review>(`/reviews?${query}`, form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  })
}

/** "Sai bài?" (design-cham-form-llm-v1.md §3.3): đổi bài, server chấm lại từ số đo đã lưu. */
export function useChangeExercise(reviewId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (exerciseId: string) => api.put<Review>(`/reviews/${reviewId}/exercise`, { exerciseId }),
    onSuccess: (review) => {
      // Đặt thẳng vào cache: trạng thái PENDING làm useReview tự poll lại tới khi chấm xong.
      queryClient.setQueryData(["review", reviewId], review)
      void queryClient.invalidateQueries({ queryKey: ["reviews"] })
    },
  })
}

/**
 * Màn camera (design-cham-form-llm-v1.md §3.2): mỗi góc một file .json toạ độ khớp, gửi như clip
 * thường. Không kèm exerciseId: analyzer tự nhận diện bài. optIn đã tick ở màn camera.
 */
export function useSubmitLive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clips: { view: CaptureView; frames: FrameJson[] }[]) => {
      const form = new FormData()
      const query = new URLSearchParams({ optIn: "true" })
      for (const clip of clips) {
        const body = new Blob([JSON.stringify({ frames: clip.frames })], { type: "application/json" })
        form.append("clips", body, `${clip.view.toLowerCase()}.json`)
        query.append("viewpoints", clip.view)
      }
      return api.postForm<Review>(`/reviews?${query}`, form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  })
}
