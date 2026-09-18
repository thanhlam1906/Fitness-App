import { WEEKDAYS } from "@/features/program/schema"

export type DraftExercise = {
  exerciseId: string
  sets: string
  repsMin: string
  repsMax: string
  loadKg: string
}

/** key = thứ trong tuần (1=T2 … 7=CN), khớp DayOfWeek.getValue() bên backend. */
export type Draft = Record<number, DraftExercise[]>

export type CustomProgramRequest = {
  startDate: string
  weeksToGenerate: number
  days: {
    dayOfWeek: number
    label: string
    exercises: {
      exerciseId: string
      sets: number
      repsMin: number
      repsMax: number
      loadKg: number | null
      restSeconds: number | null
    }[]
  }[]
}

export function emptyExercise(exerciseId: string): DraftExercise {
  return { exerciseId, sets: "3", repsMin: "8", repsMax: "12", loadKg: "" }
}

export function toCustomProgramRequest(
  draft: Draft,
  startDate: string,
  weeks: number,
): CustomProgramRequest {
  return {
    startDate,
    weeksToGenerate: weeks,
    days: Object.keys(draft)
      .map(Number)
      .sort((a, b) => a - b)
      .map((dayOfWeek) => ({
        dayOfWeek,
        label: WEEKDAYS.find((d) => d.value === dayOfWeek)!.label,
        exercises: draft[dayOfWeek].map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: Number(ex.sets),
          repsMin: Number(ex.repsMin),
          repsMax: Number(ex.repsMax),
          // Bỏ trống là "chưa biết tải", không phải 0kg.
          loadKg: ex.loadKg === "" ? null : Number(ex.loadKg),
          restSeconds: null,
        })),
      })),
  }
}

export function draftError(draft: Draft): string | null {
  const days = Object.keys(draft).map(Number)
  if (days.length === 0) return "Chọn ít nhất một ngày tập."
  for (const day of days) {
    const exercises = draft[day]
    if (exercises.length === 0) return "Mỗi ngày tập cần ít nhất một bài."
    for (const ex of exercises) {
      if (Number(ex.sets) < 1 || Number(ex.repsMin) < 1) return "Set và rep phải lớn hơn 0."
      if (Number(ex.repsMax) < Number(ex.repsMin)) {
        return "Rep tối đa phải lớn hơn hoặc bằng rep tối thiểu."
      }
    }
  }
  return null
}
