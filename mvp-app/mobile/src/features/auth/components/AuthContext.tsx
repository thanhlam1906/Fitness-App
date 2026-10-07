import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { onLoggedOut } from "~/api/client"
import { clearAllConversations } from "~/features/assistant/utils/conversation"
import type { AuthTokens } from "@/features/auth/types"
import type { RegisterPayload } from "@/features/auth/types/registerSchema"
import { authApi } from "~/features/auth/api/authApi"
import { clearSession, getRefreshToken, getStoredSession, setSession } from "~/features/auth/utils/tokenStorage"

type AuthContextValue = {
  userId: string | null
  role: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  /** Đăng nhập bằng mật khẩu tạm → đặt mật khẩu mới → vào app như đăng nhập thường. */
  completePasswordChange: (email: string, currentPassword: string, newPassword: string) => Promise<void>
  /** Cài đặt › Đổi mật khẩu. Server thu hồi mọi phiên cũ và trả token mới cho thiết bị này. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState(() => getStoredSession())
  const queryClient = useQueryClient()

  // Đăng xuất (bấm nút hay hết phiên) phải xoá cả cache React Query: không thì người đăng nhập
  // sau trên cùng máy thấy ngay tên, cân nặng, tiến bộ của người trước ở màn Cài đặt
  // (code-reviewer 09-29 #1).
  useEffect(
    () =>
      onLoggedOut(() => {
        // Web xoá cuộc trò chuyện ngay trong clearSession (cùng localStorage); mobile lưu riêng nên xoá ở đây.
        clearAllConversations()
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

  async function completePasswordChange(email: string, currentPassword: string, newPassword: string) {
    applyTokens(await authApi.changePasswordAtLogin(email, currentPassword, newPassword))
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    applyTokens(await authApi.changePassword(currentPassword, newPassword))
  }

  function logout() {
    const refreshToken = getRefreshToken()
    clearSession()
    clearAllConversations()
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
        completePasswordChange,
        changePassword,
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
