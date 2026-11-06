import { useQuery } from "@tanstack/react-query"
import { authApi } from "@/features/auth/api/authApi"

/** Cấu hình chỉ đổi khi sửa .env server rồi khởi động lại, nên đọc một lần mỗi lần mở trang. */
export function useSocialConfig() {
  return useQuery({ queryKey: ["social-config"], queryFn: authApi.socialConfig, staleTime: Infinity, retry: false })
}
