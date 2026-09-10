import type { ReactNode } from "react"
import { useLocation } from "react-router"
import { AdminShell } from "./AdminShell"
import { UserShell } from "./UserShell"

/**
 * Một app React, hai khung: bản user chạy một cột kiểu điện thoại, bản admin
 * chạy sidebar toàn màn hình (design "Fitness MVP", màn 01–10 vs 11–12).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return pathname.startsWith("/admin") ? (
    <AdminShell>{children}</AdminShell>
  ) : (
    <UserShell>{children}</UserShell>
  )
}
