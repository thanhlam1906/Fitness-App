import { Redirect, Stack, usePathname } from "expo-router"
import { Text, View } from "react-native"
import { shouldResumeOnboarding } from "@/auth/onboardingGate"
import { useAuth } from "~/auth/AuthContext"
import { Button } from "~/components/ui/Button"
import { useProfile } from "~/features/profile/useProfile"
import { colors } from "~/theme"

/** Bọc mọi màn sau đăng nhập — RequireAuth + RequireOnboarding của web gộp lại. */
export default function AppLayout() {
  const { isAuthenticated, role, logout } = useAuth()
  const pathname = usePathname()
  // Admin không có hồ sơ tập: không gọi /me/profile cho họ.
  const profile = useProfile(isAuthenticated && role !== "ADMIN")

  if (!isAuthenticated) return <Redirect href="/login" />
  // Mobile không có trang quản trị (doc/design-mobile-v1.md §1).
  if (role === "ADMIN")
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg p-6">
        <Text className="text-center text-base text-text">Tài khoản quản trị dùng bản web.</Text>
        <Button variant="secondary" onPress={logout}>
          Đăng xuất
        </Button>
      </View>
    )
  if (profile.isLoading)
    return (
      <View className="flex-1 bg-bg p-5 pt-20">
        <Text className="text-sm text-text-muted">Đang tải…</Text>
      </View>
    )
  if (shouldResumeOnboarding(role, profile.data?.onboardingStep, pathname)) {
    return <Redirect href="/onboarding" />
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
