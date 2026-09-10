import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export type CycleExerciseView = {
  slug: string
  name: string
  sets: number
  repsMin: number
  repsMax: number
  restSec: number
  needsLoad: boolean
}

export type CycleDayView = {
  order: number
  label: string
  exercises: CycleExerciseView[]
}

export type TemplateCandidate = {
  id: string
  slug: string
  name: string
  methodology: string | null
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  days: CycleDayView[]
}

export function useCandidates() {
  return useQuery({
    queryKey: ["program-candidates"],
    queryFn: () => api.get<TemplateCandidate[]>("/programs/candidates"),
    retry: false, // 404 = chưa onboarding xong, thử lại cũng thế
  })
}

/** Bài cần nhập mức tạ khởi điểm (A7) — lấy thẳng từ cấu trúc template, không bắt gõ slug. */
export function loadableExercises(template: TemplateCandidate): CycleExerciseView[] {
  const seen = new Map<string, CycleExerciseView>()
  for (const day of template.days) {
    for (const exercise of day.exercises) {
      if (exercise.needsLoad && !seen.has(exercise.slug)) {
        seen.set(exercise.slug, exercise)
      }
    }
  }
  return [...seen.values()]
}
