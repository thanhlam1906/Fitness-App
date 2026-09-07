const ACCESS_KEY = "fitness.accessToken"
const REFRESH_KEY = "fitness.refreshToken"
const USER_ID_KEY = "fitness.userId"
const ROLE_KEY = "fitness.role"

export type StoredSession = { userId: string; role: string }

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredSession(): StoredSession | null {
  const userId = localStorage.getItem(USER_ID_KEY)
  const role = localStorage.getItem(ROLE_KEY)
  return userId && role ? { userId, role } : null
}

export function setSession(accessToken: string, refreshToken: string, userId: string, role: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  localStorage.setItem(USER_ID_KEY, userId)
  localStorage.setItem(ROLE_KEY, role)
}

/** Chỉ token đổi (sau refresh) — userId/role giữ nguyên, không cần set lại. */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(ROLE_KEY)
}
