import "../global.css"
import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "~/auth/AuthContext"
import { hydrate } from "~/auth/tokenStorage"
import { colors } from "~/theme"

const queryClient = new QueryClient()

export default function RootLayout() {
  // Chưa nạp xong token mà dựng guard thì người đã đăng nhập bị đá về /login một nhịp.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    hydrate().finally(() => setReady(true))
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
