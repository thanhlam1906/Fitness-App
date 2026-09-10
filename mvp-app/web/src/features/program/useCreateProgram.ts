import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"

type CreateProgramRequest = {
  templateId: string
  restDays: number[]
  startDate: string
  startingLoadsBySlug: Record<string, number>
}

export function useCreateProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProgramRequest) =>
      api.post<{ programId: string }>("/programs", body),
    onSuccess: () => {
      // Chuong trinh cu bi archive va lich sinh lai -> ca hai cache deu cu.
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      queryClient.invalidateQueries({ queryKey: ["program-current"] })
    },
  })
}
