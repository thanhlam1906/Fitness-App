import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ScheduledExerciseView } from "./types"

type Targets = {
  targetSets: number
  targetReps: number
  targetRepsMax: number
  targetLoadKg: number | null
  restSeconds: number | null
}

/** Mọi thay đổi đều đổi nội dung lịch — invalidate để màn lịch tuần khớp ngay. */
function useScheduleMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule"] }),
  })
}

export function useUpdateScheduledExercise() {
  return useScheduleMutation(({ id, ...targets }: Targets & { id: string }) =>
    api.put<ScheduledExerciseView>(`/schedule/exercises/${id}`, targets),
  )
}

export function useAddScheduledExercise() {
  return useScheduleMutation(
    ({ workoutId, ...body }: Targets & { workoutId: string; exerciseId: string }) =>
      api.post<ScheduledExerciseView>(`/schedule/workouts/${workoutId}/exercises`, body),
  )
}

export function useRemoveScheduledExercise() {
  return useScheduleMutation((id: string) => api.del<void>(`/schedule/exercises/${id}`))
}

export type ExerciseTarget = {
  exerciseId: string
  targetSets: number
  targetReps: number
  targetRepsMax: number
  targetLoadKg: number | null
}

/** Sửa một loại buổi cho mọi buổi còn lại — một lời gọi, một transaction ở backend. */
export function useEditProgramDay() {
  return useScheduleMutation((body: { label: string; remove: string[]; update: ExerciseTarget[]; add: ExerciseTarget[] }) =>
    api.put<{ updatedWorkouts: number }>("/schedule/days", body),
  )
}

/** Đổi ngày tập: ngày các buổi và ngày nghỉ của chương trình cùng đổi. */
export function useChangeTrainingDays() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (days: number[]) => api.put<{ movedWorkouts: number }>("/programs/current/training-days", { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      queryClient.invalidateQueries({ queryKey: ["program-current"] })
    },
  })
}
