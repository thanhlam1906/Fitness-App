import { createContext, useContext, useState, type ReactNode } from "react"

const STORAGE_KEY = "fitness.currentUserId"

type CurrentUserContextValue = {
  userId: string | null
  setUserId: (id: string | null) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

/**
 * Thay AuthContext thật (chưa có — backend chưa cấp JWT, xem
 * concept-backend-v1.md §0 L1). Đây là chỗ cắm userId thủ công để test các
 * API đã có. Đổi thành AuthContext thật (token + /auth/login) khi backend
 * có JwtIssuer, giữ nguyên hình dạng interface để đổi chỗ dùng ít nhất.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  function setUserId(id: string | null) {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
    setUserIdState(id)
  }

  return (
    <CurrentUserContext.Provider value={{ userId, setUserId }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error("useCurrentUser phải nằm trong CurrentUserProvider")
  return ctx
}
