import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Exercise, ExerciseInput, FormCheck, FormCheckInput, ImageDrafts } from "@/features/exercise/types"

const exercisesKey = ["exercises"] as const
const formChecksKey = (exerciseId: string) => ["exercises", exerciseId, "form-checks"] as const

export function useExercises() {
  return useQuery({
    queryKey: exercisesKey,
    queryFn: () => api.get<Exercise[]>("/exercises"),
  })
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: [...exercisesKey, id],
    queryFn: () => api.get<Exercise>(`/exercises/${id}`),
    enabled: !!id,
  })
}

export function useSaveExercise(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ExerciseInput) =>
      id ? api.put<Exercise>(`/exercises/${id}`, input) : api.post<Exercise>("/exercises", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}

/** Gửi các ô ảnh có bản nháp sau khi lưu bài (doc/design-anh-bai-tap-v1.md §2): file mới thì đặt, "remove" thì xoá. */
export function useSaveExerciseImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, drafts }: { id: string; drafts: ImageDrafts }) => {
      for (const kind of ["still", "animated"] as const) {
        const draft = drafts[kind]
        if (draft === "remove") {
          await api.del<void>(`/exercises/${id}/images/${kind}`)
        } else if (draft) {
          const form = new FormData()
          form.append("file", draft)
          await api.postForm<void>(`/exercises/${id}/images/${kind}`, form)
        }
      }
    },
    // onSettled, không onSuccess: ảnh tĩnh lên rồi mà ảnh động lỗi thì danh sách vẫn phải thấy ảnh tĩnh mới.
    onSettled: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}

export function useDeactivateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<Exercise>(`/exercises/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}

export function useFormChecks(exerciseId: string) {
  return useQuery({
    queryKey: formChecksKey(exerciseId),
    queryFn: () => api.get<FormCheck[]>(`/exercises/${exerciseId}/form-checks`),
    enabled: !!exerciseId,
  })
}

export function useSaveFormCheck(exerciseId: string, id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FormCheckInput) =>
      id
        ? api.put<FormCheck>(`/exercises/${exerciseId}/form-checks/${id}`, input)
        : api.post<FormCheck>(`/exercises/${exerciseId}/form-checks`, input),
    // Cả danh sách bài: analyzable, số khớp, checkViews đổi theo.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}

export function useDeactivateFormCheck(exerciseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<FormCheck>(`/exercises/${exerciseId}/form-checks/${id}`),
    // Cả danh sách bài: analyzable, số khớp, checkViews đổi theo.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKey }),
  })
}
