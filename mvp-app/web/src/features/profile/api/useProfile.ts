import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { BodyMetric, Profile, ProfilePatch, Progress } from "@/features/profile/types"

export const profileKey = ["profile"] as const
const bodyMetricsKey = ["body-metrics"] as const

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api.get<Profile>("/me/profile"),
    enabled,
  })
}

/**
 * PATCH từng bước (A ở §4 ke-hoach-chi-tiet-chuc-nang-v1.md: "bỏ dở được rồi
 * quay lại tiếp"). Backend trả hồ sơ sau khi sửa nên ghi thẳng vào cache, khỏi
 * gọi lại GET.
 */
export function usePatchProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.patch<Profile>("/me/profile", patch),
    onSuccess: (profile) => queryClient.setQueryData(profileKey, profile),
  })
}

export function useSaveBodyMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { heightCm?: number | null; weightKg?: number | null }) =>
      api.post<void>("/me/body-metrics", body),
    // Cả hồ sơ (cân nặng mới nhất) lẫn màn Lịch sử cân nặng đọc số này.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKey }),
        queryClient.invalidateQueries({ queryKey: bodyMetricsKey }),
      ]),
  })
}

/** Mọi lần đo, mới nhất trước — màn Cài đặt › Lịch sử cân nặng. */
export function useBodyMetrics() {
  return useQuery({
    queryKey: bodyMetricsKey,
    queryFn: () => api.get<BodyMetric[]>("/me/body-metrics"),
  })
}

/** Màn Cài đặt › Tiến bộ và dòng tóm tắt ở menu. Số do backend tính (ProgressService). */
export function useProgress(weeks: number) {
  return useQuery({
    queryKey: ["progress", weeks],
    queryFn: () => api.get<Progress>(`/me/progress?weeks=${weeks}`),
  })
}
