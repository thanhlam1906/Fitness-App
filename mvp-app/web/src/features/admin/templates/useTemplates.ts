import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ProgramTemplate, ProgramTemplateInput } from "./types"

const templatesKey = ["admin", "program-templates"] as const

export function useTemplates() {
  return useQuery({
    queryKey: templatesKey,
    queryFn: () => api.get<ProgramTemplate[]>("/program-templates"),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: [...templatesKey, id],
    queryFn: () => api.get<ProgramTemplate>(`/program-templates/${id}`),
    enabled: !!id,
  })
}

export function useSaveTemplate(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProgramTemplateInput) =>
      id
        ? api.put<ProgramTemplate>(`/program-templates/${id}`, input)
        : api.post<ProgramTemplate>("/program-templates", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  })
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<ProgramTemplate>(`/program-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  })
}
