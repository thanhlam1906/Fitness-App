import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Exercise, Review } from "@/features/review/types"
import { api } from "~/api/client"

// Bản mobile của web/src/features/review/api/useReviews.ts, trừ useSubmitLive: màn camera nhận dạng
// tư thế cần thư viện native ngoài Expo Go, nên mobile chỉ gửi video quay sẵn (người dùng chốt 10-09).
const IN_FLIGHT: Review["status"][] = ["PENDING", "PROCESSING"]

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.get<Review[]>("/reviews"),
    // Analyzer chấm mất vài giây tới vài chục giây: poll khi còn việc đang chạy, đứng yên khi xong.
    refetchInterval: (query) => ((query.state.data ?? []).some((r) => IN_FLIGHT.includes(r.status)) ? 5000 : false),
  })
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => api.get<Review>(`/reviews/${id}`),
    refetchInterval: (query) => (query.state.data && IN_FLIGHT.includes(query.state.data.status) ? 3000 : false),
  })
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["exercise", id],
    queryFn: () => api.get<Exercise>(`/exercises/${id}`),
  })
}

/** Một clip đã quay hoặc chọn từ thư viện ảnh của máy. */
export type Clip = { uri: string; name: string; type: string }

/**
 * C4 — opt-in gửi clip nằm ở màn hướng dẫn quay, không ở nơi khác. Backend từ chối nếu thiếu, nên
 * không có đường nào gửi clip mà chưa đồng ý.
 */
export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ exerciseId, clips, viewpoints }: { exerciseId: string; clips: Clip[]; viewpoints: string[] }) => {
      const form = new FormData()
      // FormData của React Native nhận { uri, name, type } thay cho File: nó tự đọc file từ uri khi gửi.
      clips.forEach((clip) => form.append("clips", clip as unknown as Blob))
      const query = new URLSearchParams({ exerciseId, optIn: "true" })
      viewpoints.forEach((v) => query.append("viewpoints", v))
      return api.postForm<Review>(`/reviews?${query}`, form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  })
}
