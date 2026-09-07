import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { CreateProgramFormValues } from "./schema"

type CreateProgramResponse = { programId: string }

export function useCreateProgram(userId: string) {
  return useMutation({
    mutationFn: (values: CreateProgramFormValues) =>
      api.post<CreateProgramResponse>("/programs", {
        userId,
        templateId: values.templateId,
        startingLoadsBySlug: Object.fromEntries(
          values.startingLoads.map((l) => [l.slug, l.kg]),
        ),
        restDays: values.restDays,
        startDate: values.startDate,
      }),
  })
}
