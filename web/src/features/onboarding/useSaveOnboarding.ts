import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { OnboardingFormValues } from "./schema"

export function useSaveOnboarding() {
  return useMutation({
    mutationFn: (values: OnboardingFormValues) => api.put<void>("/me/profile", values),
  })
}
