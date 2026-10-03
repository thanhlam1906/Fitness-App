export type ProgramTemplate = {
  id: string
  slug: string
  name: string
  methodology: string | null
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  weekStructure: string // JSON thô — [{order,label,exercises:[...]}], xem F4
  progression: string // JSON thô — {mode,target_rpe,increment_kg}
  active: boolean
}

export type ProgramTemplateInput = {
  slug?: string // bắt buộc khi tạo, bỏ qua khi sửa
  name: string
  methodology: string
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  weekStructure: string
  progression: string
  active: boolean
}

/** Khớp record của CorpusUploadService và CorpusDocuments ở backend. */
export type UploadStatus = "PROCESSING" | "READY" | "FAILED"

export type Replaces = { title: string; ingestedAt: string; chunkCount: number }

export type CorpusUpload = {
  id: string
  fileName: string
  status: UploadStatus
  error: string | null
  createdAt: string
  replaces: Replaces | null
}

export type ChunkPreview = { heading: string; content: string }

export type CorpusUploadDetail = CorpusUpload & { chunks: ChunkPreview[] }

export type CorpusDocument = {
  id: string
  title: string
  source: string
  ingestedAt: string
  chunkCount: number
  wrongCount: number
}

/** ord đếm từ 0; màn hình đánh số từ 1. */
export type DocumentChunk = { id: string; ord: number; heading: string; content: string }

export type WrongAnswer = {
  messageId: string
  question: string | null
  answer: string
  note: string | null
  createdAt: string
  chunkOrds: number[]
}

export type CorpusDocumentDetail = CorpusDocument & { chunks: DocumentChunk[]; wrongAnswers: WrongAnswer[] }

export type Published = { documentId: string; chunkCount: number }
