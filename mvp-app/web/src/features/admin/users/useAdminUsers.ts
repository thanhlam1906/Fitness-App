import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export type AdminUserRow = {
  id: string
  email: string
  role: string
  active: boolean
  createdAt: string
  lastActivityAt: string | null
  programName: string | null
  /** Tuần đang tới của chương trình; null khi chưa có chương trình chạy. */
  weekIndex: number | null
  totalWeeks: number | null
  sessionCount: number
  clipCount: number
  /** Buổi đã xong / tổng buổi đã xếp lịch, tính sẵn ở backend. */
  adherencePct: number | null
}

export type AdminOverview = {
  userCount: number
  activeLast7Days: number
  sessionsThisWeek: number
  reviewsInQueue: number
  wrongFeedbackCount: number
}

const usersKey = ["admin-users"] as const

/** Dùng chung giữa màn 11 và badge đếm trên sidebar — cùng queryKey nên chỉ một request. */
export function useAdminUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: () => api.get<AdminUserRow[]>("/admin/users"),
  })
}

/** Bốn ô thống kê đầu màn 11, và hai badge "Hàng đợi" / "Góp ý bị báo sai" ở sidebar. */
export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<AdminOverview>("/admin/overview"),
  })
}
