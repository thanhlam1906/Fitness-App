import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Exercise, Review } from "@/features/review/types"
import { stillRunning } from "@/features/review/utils/reviewView"
import { api } from "~/api/client"

// Bản mobile của web/src/features/review/api/useReviews.ts, trừ useSubmitLive: màn camera nhận dạng
// tư thế cần thư viện native ngoài Expo Go, nên mobile chỉ gửi video quay sẵn (người dùng chốt 10-09).

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.get<Review[]>("/reviews"),
    // Analyzer chấm mất vài giây tới vài chục giây: poll khi còn việc đang chạy, đứng yên khi xong.
    refetchInterval: (query) => ((query.state.data ?? []).some((r) => stillRunning(r)) ? 5000 : false),
  })
}

export function useReview(id: string) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => api.get<Review>(`/reviews/${id}`),
    refetchInterval: (query) => (query.state.data && stillRunning(query.state.data) ? 3000 : false),
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
 *
 * Video vài chục MB qua 4G mất cả phút: trả thêm tiến độ tải lên (0–1) và `cancel` cho nút Huỷ, như web.
 */
export function useSubmitReview() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)
  const abort = useRef<AbortController | null>(null)
  const mutation = useMutation({
    mutationFn: ({ exerciseId, clips, viewpoints }: { exerciseId: string; clips: Clip[]; viewpoints: string[] }) => {
      const form = new FormData()
      // FormData của React Native nhận { uri, name, type } thay cho File: nó tự đọc file từ uri khi gửi.
      clips.forEach((clip) => form.append("clips", clip as unknown as Blob))
      const query = new URLSearchParams({ exerciseId, optIn: "true" })
      viewpoints.forEach((v) => query.append("viewpoints", v))
      abort.current = new AbortController()
      setProgress(0)
      return api.uploadForm<Review>(`/reviews?${query}`, form, {
        onProgress: setProgress,
        signal: abort.current.signal,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  })
  return { ...mutation, progress, cancel: () => abort.current?.abort() }
}
