import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

// Sau khi bỏ/đưa vào/gỡ chỉ làm mới DANH SÁCH (exact). Không exact thì key tiền tố trúng luôn query chi
// tiết của chính thứ vừa đi khỏi: màn đó còn mở nên nó tải lại, nhận 404, thử lại 3 lần, và navigate
// trong onSuccess phải chờ hết (~7 s đứng màn).
const refreshList = (queryClient: QueryClient, queryKey: readonly string[]) =>
  queryClient.invalidateQueries({ queryKey, exact: true })

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
    onSuccess: () => refreshList(queryClient, uploadsKey),
  })
}

export function usePublishUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.post<Published>(`/admin/corpus/uploads/${id}/publish`, { title }),
    onSuccess: () => Promise.all([refreshList(queryClient, uploadsKey), refreshList(queryClient, documentsKey)]),
  })
}

export function useDiscardUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/admin/corpus/uploads/${id}`),
    onSuccess: () => refreshList(queryClient, uploadsKey),
  })
}

export function useRemoveDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/admin/corpus/documents/${id}`),
    onSuccess: () => refreshList(queryClient, documentsKey),
  })
}
