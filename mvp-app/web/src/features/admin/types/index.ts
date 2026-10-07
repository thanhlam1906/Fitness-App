export type TemplateExercise = { slug: string; sets: number; repsMin: number; repsMax: number; restSec: number }

export type TemplateDay = { label: string; exercises: TemplateExercise[] }

/** Con số của bộ quy tắc tăng tạ. incrementKg: thiếu khoá = chưa chọn, null = "Không tự tăng". */
export type Progression = {
  targetRpe: number
  rpeLowStreak: number
  rpeOver: number
  minCompletionPct: number
  missedSetsToDeload: number
  failStreakToDeload: number
  deloadPct: number
  incrementKg: Record<string, number | null>
}

/** Khớp ProgramTemplateAdminResponse. activeUsers = số người đang dùng (quy tắc đổi là áp ngay cho họ). */
export type ProgramTemplate = {
  id: string
  slug: string
  name: string
  methodology: string | null
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  active: boolean
  days: TemplateDay[]
  progression: Progression
  activeUsers: number
}

/** Khớp ProgramTemplateRequest. Không có slug: backend sinh từ tên. */
export type ProgramTemplateInput = {
  name: string
  methodology: string
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  active: boolean
  days: TemplateDay[]
  progression: Progression
}

export type ProgressionPreviewInput = {
  progression: Progression
  slug: string
  sets: number
  repsMin: number
  repsMax: number
  loadKg: number
  reps: number[]
  rpe: number | null
  pain: boolean
  painBefore: boolean
  failStreakBefore: number
  rpeLowStreakBefore: number
}

export type ProgressionPreview = {
  direction: "UP" | "DOWN" | "HOLD" | "SUBSTITUTE"
  deltaKg: number | null
  newLoadKg: number
  ruleId: string
  ruleParams: Record<string, unknown>
  messageVi: string
}

/** Khớp các DTO kho kiến thức ở backend (assistant/dto: UploadRowResponse, DocumentDetailResponse…). */
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

export type UserStatus = "TRAINING" | "NOT_STARTED" | "IDLE" | "LOCKED"
export type UserRole = "USER" | "ADMIN"

export type AdminUserRow = {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  active: boolean
  status: UserStatus
  createdAt: string
  lastActivityAt: string | null
  programName: string | null
  /** Tuần đang tới của chương trình; null khi chưa có chương trình chạy. */
  weekIndex: number | null
  totalWeeks: number | null
  sessionCount: number
  clipCount: number
  /** Buổi đã xong / tổng buổi đã xếp lịch, tính sẵn ở backend. */
  adherencePct: number | null
}

/** Một trang kết quả; `page` đếm từ 0. */
export type AdminPage<T> = { items: T[]; total: number; page: number; size: number }

/** Bốn ô chỉ đếm người tập; `statusCounts` đếm mọi tài khoản (số trên tab). */
export type AdminOverview = {
  traineeCount: number
  newTraineesLast7Days: number
  activeTraineesLast7Days: number
  notStartedTrainees: number
  traineeSessionsLast7Days: number
  statusCounts: Record<"ALL" | UserStatus, number>
  wrongFeedbackCount: number
}

export type AdminUserDetail = {
  user: AdminUserRow
  fullName: string | null
  phone: string | null
  mustChangePassword: boolean
  goal: string | null
  experience: string | null
  sessionsPerWeek: number | null
  equipment: string[]
  birthYear: number | null
  gender: string | null
  disclaimerAt: string | null
  onboardingStep: string
  heightCm: number | null
  weightKg: number | null
  measuredOn: string | null
  activeProgramName: string | null
}

export type AuditAction = "CREATE" | "LOCK" | "UNLOCK" | "CHANGE_ROLE" | "RESET_PASSWORD" | "DELETE"

export type AdminAuditEntry = {
  id: string
  actorEmail: string
  /** null = tài khoản đã bị xoá. */
  targetId: string | null
  targetEmail: string
  action: AuditAction
  detail: Record<string, string> | null
  reason: string | null
  createdAt: string
}

export type CreateUserPayload = { fullName: string; email: string; phone: string | null; role: UserRole }
export type AdminUserCreated = { user: AdminUserRow; temporaryPassword: string }
