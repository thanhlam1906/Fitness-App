import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { CustomProgramRequest } from "./customProgram"

export function useCreateCustomProgram() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CustomProgramRequest) =>
      api.post<{ programId: string }>("/programs/custom", body),
    onSuccess: () => {
      // Chương trình cũ bị archive và lịch sinh lại — cả hai cache đều cũ.
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
      queryClient.invalidateQueries({ queryKey: ["program-current"] })
    },
  })
}
