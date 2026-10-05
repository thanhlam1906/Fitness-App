import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { onLoggedOut } from "@/api/client"
import { authApi } from "@/features/auth/api/authApi"
import type { AuthTokens } from "@/features/auth/types"
import type { RegisterPayload } from "@/features/auth/types/registerSchema"
import { clearSession, getRefreshToken, getStoredSession, setSession } from "@/features/auth/utils/tokenStorage"

type AuthContextValue = {
  userId: string | null
  role: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState(() => getStoredSession())
  const queryClient = useQueryClient()

  // Đăng xuất (bấm nút hay hết phiên) phải xoá cả cache React Query: không thì người đăng nhập
  // sau trên cùng tab thấy ngay tên, cân nặng, tiến bộ của người trước ở màn Cài đặt
  // (code-reviewer 09-29 #1).
  useEffect(
    () =>
      onLoggedOut(() => {
        queryClient.clear()
        setSessionState(null)
      }),
    [queryClient],
  )

  function applyTokens(tokens: AuthTokens) {
    setSession(tokens.accessToken, tokens.refreshToken, tokens.userId, tokens.role)
    setSessionState({ userId: tokens.userId, role: tokens.role })
  }

  async function login(email: string, password: string) {
    applyTokens(await authApi.login(email, password))
  }

  async function register(payload: RegisterPayload) {
    applyTokens(await authApi.register(payload))
  }

  function logout() {
    const refreshToken = getRefreshToken()
    clearSession()
    queryClient.clear()
    setSessionState(null)
    // best-effort: thu hồi refresh token ở server, không chặn logout nếu request lỗi
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {})
    }
  }

  return (
    <AuthContext.Provider
      value={{
        userId: session?.userId ?? null,
        role: session?.role ?? null,
        isAuthenticated: session !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider")
  return ctx
}
