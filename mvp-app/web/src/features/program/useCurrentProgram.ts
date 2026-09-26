import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export type CurrentProgram = {
  id: string
  templateName: string
  methodology: string | null
  startDate: string
  restDays: number[]
}

/** Hồ sơ và khung "Sửa lịch" cùng đọc. 404 = chưa có chương trình, không cần thử lại. */
export function useCurrentProgram() {
  return useQuery({
    queryKey: ["program-current"],
    queryFn: () => api.get<CurrentProgram>("/programs/current"),
    retry: false,
  })
}
