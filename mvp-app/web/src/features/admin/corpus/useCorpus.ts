import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type {
  CorpusDocument,
  CorpusDocumentDetail,
  CorpusUpload,
  CorpusUploadDetail,
  Published,
} from "./types"

const uploadsKey = ["admin", "corpus", "uploads"] as const
const documentsKey = ["admin", "corpus", "documents"] as const

// Còn file đang trích thì hỏi lại mỗi 3 s để thấy nó chuyển sang "Chờ duyệt"; hết thì thôi.
const POLL_MS = 3000

export function useUploads() {
  return useQuery({
    queryKey: uploadsKey,
    queryFn: () => api.get<CorpusUpload[]>("/admin/corpus/uploads"),
    refetchInterval: (query) => (query.state.data?.some((u) => u.status === "PROCESSING") ? POLL_MS : false),
  })
}

export function useUpload(id: string) {
  return useQuery({
    queryKey: [...uploadsKey, id],
    queryFn: () => api.get<CorpusUploadDetail>(`/admin/corpus/uploads/${id}`),
    refetchInterval: (query) => (query.state.data?.status === "PROCESSING" ? POLL_MS : false),
  })
}

export function useDocuments() {
  return useQuery({
    queryKey: documentsKey,
    queryFn: () => api.get<CorpusDocument[]>("/admin/corpus/documents"),
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [...documentsKey, id],
    queryFn: () => api.get<CorpusDocumentDetail>(`/admin/corpus/documents/${id}`),
  })
}

export function useUploadPdf() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return api.postForm<CorpusUpload>("/admin/corpus/uploads", form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: uploadsKey }),
  })
}

export function usePublishUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.post<Published>(`/admin/corpus/uploads/${id}/publish`, { title }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: uploadsKey }),
        queryClient.invalidateQueries({ queryKey: documentsKey }),
      ]),
  })
}

export function useDiscardUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/admin/corpus/uploads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: uploadsKey }),
  })
}

export function useRemoveDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/admin/corpus/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsKey }),
  })
}
