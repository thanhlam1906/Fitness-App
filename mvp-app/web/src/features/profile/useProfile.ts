import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Profile, ProfilePatch } from "./types"

export const profileKey = ["profile"] as const

export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api.get<Profile>("/me/profile"),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}
