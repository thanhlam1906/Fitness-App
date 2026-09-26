import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { useProfile } from "@/features/profile/useProfile"
import { useAuth } from "./AuthContext"
import { shouldResumeOnboarding } from "./onboardingGate"

/** Bọc các màn sau đăng nhập: onboarding còn dở thì về đúng bước dở (onboardingGate.ts). */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const { pathname } = useLocation()
  // Admin không có hồ sơ tập: không gọi /me/profile cho họ.
  const profile = useProfile(role !== "ADMIN")

  if (role !== "ADMIN" && profile.isLoading) {
    return <p className="p-5 text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if (shouldResumeOnboarding(role, profile.data?.onboardingStep, pathname)) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}
