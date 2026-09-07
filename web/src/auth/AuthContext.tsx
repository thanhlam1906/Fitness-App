import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, onLoggedOut } from "@/api/client"
import { clearSession, getRefreshToken, getStoredSession, setSession } from "./tokenStorage"

type AuthTokens = { accessToken: string; refreshToken: string; userId: string; role: string }

type AuthContextValue = {
  userId: string | null
  role: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState(() => getStoredSession())

  useEffect(() => onLoggedOut(() => setSessionState(null)), [])

  function applyTokens(tokens: AuthTokens) {
    setSession(tokens.accessToken, tokens.refreshToken, tokens.userId, tokens.role)
    setSessionState({ userId: tokens.userId, role: tokens.role })
  }

  async function login(email: string, password: string) {
    applyTokens(await api.post<AuthTokens>("/auth/login", { email, password }))
  }

  async function register(email: string, password: string) {
    applyTokens(await api.post<AuthTokens>("/auth/register", { email, password }))
  }

  function logout() {
    const refreshToken = getRefreshToken()
    clearSession()
    setSessionState(null)
    // best-effort: thu hồi refresh token ở server, không chặn logout nếu request lỗi
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {})
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
