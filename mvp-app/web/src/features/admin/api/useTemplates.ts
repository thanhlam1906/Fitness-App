import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { ProgramTemplate, ProgramTemplateInput, ProgressionPreview, ProgressionPreviewInput } from "@/features/admin/types"

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

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<ProgramTemplate>(`/program-templates/${id}/duplicate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey }),
  })
}

/** Không ghi gì ở backend nên dùng query: cùng đầu vào thì lấy lại kết quả cũ. null = chưa đủ số để thử. */
export function useProgressionPreview(input: ProgressionPreviewInput | null) {
  return useQuery({
    queryKey: ["admin", "progression-preview", input],
    queryFn: () => api.post<ProgressionPreview>("/program-templates/progression-preview", input!),
    enabled: input != null,
    retry: false,
    placeholderData: keepPreviousData,
  })
}
