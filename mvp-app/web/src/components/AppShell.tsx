import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { AdminShell } from "@/features/admin/components/AdminShell"
import { useAuth } from "@/features/auth/components/AuthContext"
import { isAdminPathBlocked } from "@/features/auth/utils/adminGate"
import { UserShell } from "./UserShell"

/**
 * Một app React, hai khung: bản user chạy một cột kiểu điện thoại, bản admin
 * chạy sidebar toàn màn hình (design "Fitness MVP", màn 01–10 vs 11–12).
 * Chặn vai trò TRƯỚC khi dựng AdminShell: sidebar admin tự gọi API quản trị khi mount.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { role } = useAuth()
  if (isAdminPathBlocked(pathname, role)) return <Navigate to="/schedule" replace />
  return pathname.startsWith("/admin") ? (
    <AdminShell>{children}</AdminShell>
  ) : (
    <UserShell>{children}</UserShell>
  )
}
