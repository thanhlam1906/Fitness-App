import { useQuery } from "@tanstack/react-query"
import type { Review } from "@/features/review/types"
import { api } from "~/api/client"

// Chỉ phần đọc của web/src/features/review/useReviews.ts: mobile v1 chỉ xem kết quả, chấm mới và
// "Sai bài?" vẫn ở bản web (doc/design-mobile-v1.md §8).
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
