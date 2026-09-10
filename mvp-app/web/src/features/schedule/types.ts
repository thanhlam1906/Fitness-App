import type { LoadDecision } from "@/components/LoadDeltaBadge"

export type ScheduledExerciseView = {
  id: string
  exerciseId: string
  exerciseSlug: string
  exerciseName: string
  analyzable: boolean
  orderIndex: number
  targetSets: number
  targetReps: number
  targetRepsMax: number
  targetLoadKg: number | null
  restSeconds: number | null
  substitutedFromName: string | null
  loadDecision: LoadDecision | null
}

export type ScheduledWorkoutView = {
  id: string
  scheduledOn: string // ISO date, vd "2026-09-07"
  weekIndex: number
  label: string | null
  status: "PLANNED" | "DONE" | "SKIPPED" | "MISSED"
  exercises: ScheduledExerciseView[]
}

export type ScheduleResponse = {
  programId: string
  startDate: string
  restDays: number[] // 1=T2 … 7=CN
  workouts: ScheduledWorkoutView[]
}
