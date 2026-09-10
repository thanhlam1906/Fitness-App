import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Exercise, Review } from "./types"

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
