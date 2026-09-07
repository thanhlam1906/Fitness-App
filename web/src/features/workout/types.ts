export type SessionResponse = {
  id: string
  userId: string
  scheduledWorkoutId: string | null
  status: "IN_PROGRESS" | "DONE" | "ABANDONED"
}

export type SetLogInput = {
  exerciseId: string
  setIndex: number
  targetReps: number | null
  reps: number | null
  loadKg: number | null
  rpe: number | null
  skipped: boolean
  skipReason: string | null
}

export type SetLogResponse = SetLogInput & { id: string }

export type PainReportInput = {
  bodyArea: string
  severity: number
  note: string
}
