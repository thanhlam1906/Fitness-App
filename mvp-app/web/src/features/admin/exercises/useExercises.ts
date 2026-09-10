import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Exercise, ExerciseInput, FormCheck, FormCheckInput } from "./types"

const exercisesKey = ["admin", "exercises"] as const
const formChecksKey = (exerciseId: string) => ["admin", "exercises", exerciseId, "form-checks"] as const

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: formChecksKey(exerciseId) }),
  })
}

export function useDeactivateFormCheck(exerciseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<FormCheck>(`/exercises/${exerciseId}/form-checks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: formChecksKey(exerciseId) }),
  })
}
