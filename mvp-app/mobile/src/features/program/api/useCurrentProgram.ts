import { useQuery } from "@tanstack/react-query"
import { api } from "~/api/client"

export type CurrentProgram = {
  id: string
  /** null = lịch tự thiết kế. */
  templateId: string | null
  templateName: string
  methodology: string | null
  startDate: string
  restDays: number[]
  /** Khoảng buổi/tuần template soạn cho; null với lịch tự thiết kế. */
  sessionsMin: number | null
  sessionsMax: number | null
}

/** Hồ sơ và màn Chương trình cùng đọc. 404 = chưa có chương trình, không cần thử lại. */
export function useCurrentProgram() {
  return useQuery({
    queryKey: ["program-current"],
    queryFn: () => api.get<CurrentProgram>("/programs/current"),
    retry: false,
  })
}
