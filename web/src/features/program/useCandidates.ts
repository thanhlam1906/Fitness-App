import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export type TemplateCandidate = {
  id: string
  slug: string
  name: string
  methodology: string | null
}

export function useCandidates() {
  return useQuery({
    queryKey: ["program-candidates"],
    queryFn: () => api.get<TemplateCandidate[]>("/programs/candidates"),
  })
}
