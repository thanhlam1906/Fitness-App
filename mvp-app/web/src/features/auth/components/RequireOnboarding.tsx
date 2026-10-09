import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/features/profile/api/useProfile"
import { useAuth } from "./AuthContext"
import { shouldResumeOnboarding } from "@/features/auth/utils/onboardingGate"

/** Bọc các màn sau đăng nhập: onboarding còn dở thì về đúng bước dở (onboardingGate.ts). */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const { pathname } = useLocation()
  // Admin không có hồ sơ tập: không gọi /me/profile cho họ.
  const profile = useProfile(role !== "ADMIN")

  if (role !== "ADMIN" && profile.isLoading) {
    return <PageSkeleton className="p-5" />
  }
  if (shouldResumeOnboarding(role, profile.data?.onboardingStep, pathname)) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}
