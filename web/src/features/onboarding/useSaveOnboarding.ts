import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { OnboardingFormValues } from "./schema"

export function useSaveOnboarding(userId: string) {
  return useMutation({
    mutationFn: (values: OnboardingFormValues) =>
      api.put<void>(`/profiles/${userId}`, values),
  })
}
