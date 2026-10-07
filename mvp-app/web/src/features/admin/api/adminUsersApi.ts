import { api } from "@/api/client"
import { toUsersApiQuery, type UserListParams } from "@/features/admin/utils/userListParams"

/** Xuất CSV toàn bộ kết quả đang lọc — file do server tạo (có BOM, chặn công thức Excel). */
export async function downloadUsersCsv(params: UserListParams) {
  const blob = await api.getBlob(`/admin/users/export?${toUsersApiQuery(params, false)}`)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "nguoi-dung.csv"
  a.click()
  // Thu hồi ngay sau click có thể huỷ lượt tải ở vài trình duyệt; để sau một nhịp.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
