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

export type AdminUserRow = {
  id: string
  email: string
  role: string
  active: boolean
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

export type AdminOverview = {
  userCount: number
  activeLast7Days: number
  sessionsThisWeek: number
  reviewsInQueue: number
  wrongFeedbackCount: number
}

export type AdminUserDetail = {
  user: AdminUserRow
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

/** GET /admin/workout-insights — doc/design-trang-buoi-tap-v1.md §6. Mỗi danh sách tối đa 5 dòng, đã sắp. */
export type WorkoutInsights = {
  days: number
  templateId: string | null
  /** Tổng cả khoảng, kể cả bài bị ẩn ở các khối top 5. skipReasons đủ 4 mã, thứ tự cố định. */
  summary: {
    sessions: number
    users: number
    missedWorkouts: number
    sets: number
    skippedSets: number
    skipReasons: { key: string; count: number }[]
    rpeLogs: number
    overCount: number
    painReports: number
    painUsers: number
    avgPainSeverity: number
    up: number
    hold: number
    down: number
  }
  skipped: {
    exerciseId: string
    exerciseName: string
    sets: number
    skippedSets: number
    users: number
    topReason: string | null
  }[]
  rpeOver: { exerciseId: string; exerciseName: string; rpeLogs: number; overCount: number; avgRpe: number }[]
  repShort: {
    exerciseId: string
    exerciseName: string
    sets: number
    shortSets: number
    avgReps: number
    avgFloor: number
  }[]
  substituted: {
    exerciseId: string
    exerciseName: string
    usersSubstituted: number
    usersScheduled: number
    topReplacementName: string | null
  }[]
  pain: { bodyArea: string; reports: number; users: number; avgSeverity: number; topExerciseName: string | null }[]
  /** key = templateId khi lọc "Tất cả" (null = lịch tự thiết kế), exerciseId khi lọc một template. */
  loadDecisions: { key: string | null; name: string; up: number; hold: number; down: number; topDownRule: string | null }[]
}
