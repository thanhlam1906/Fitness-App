import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useAuth } from "./AuthContext"

/** Lưới thứ hai sau AppShell: không phải admin thì về Lịch, không báo gì (doc/design-quan-ly-user-v1.md §6.1). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (role !== "ADMIN") return <Navigate to="/schedule" replace />
  return <>{children}</>
}
