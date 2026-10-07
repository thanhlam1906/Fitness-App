import { useQuery } from "@tanstack/react-query"
import type { Exercise } from "@/features/exercise/types"
import { api } from "~/api/client"

// Chỉ phần đọc danh sách bài của web/src/features/exercise/api/useExercises.ts (mobile không có
// trang quản trị). Cùng queryKey để hai nơi dùng chung cache nếu sau này có thêm.
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: () => api.get<Exercise[]>("/exercises"),
  })
}
