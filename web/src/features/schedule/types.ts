export type ScheduledExerciseView = {
  id: string
  exerciseSlug: string
  exerciseName: string
  orderIndex: number
  targetSets: number
  targetReps: number
  targetLoadKg: number | null
  restSeconds: number | null
  loadChangeReason: string | null
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
  workouts: ScheduledWorkoutView[]
}
