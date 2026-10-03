import "../global.css"
import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query"
import { AuthProvider } from "~/features/auth/components/AuthContext"
import { hydrate } from "~/features/auth/utils/tokenStorage"
import { hydrateConversations } from "~/features/assistant/utils/conversation"
import { colors } from "~/theme"

const queryClient = new QueryClient()

// React Query chỉ tự biết "trang được nhìn lại" trên trình duyệt. Trên điện thoại nối với AppState:
// mở app lên lại thì tải lại dữ liệu cũ, như web tải lại khi quay về tab (code-reviewer 10-02 #1).
focusManager.setEventListener((onFocus) => {
  const sub = AppState.addEventListener("change", (state) => onFocus(state === "active"))
  return () => sub.remove()
})

export default function RootLayout() {
  // Chưa nạp xong token mà dựng guard thì người đã đăng nhập bị đá về /login một nhịp.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.all([hydrate(), hydrateConversations()]).finally(() => setReady(true))
  }, [])
  if (!ready) return null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
