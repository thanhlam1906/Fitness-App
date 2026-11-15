import type { AuthTokens, SocialConfig, SocialProvider } from "@/features/auth/types"
import type { RegisterPayload } from "@/features/auth/types/registerSchema"
import { api } from "~/api/client"

// Hàm thường, không phải hook: AuthContext gọi trong login/register/logout của nó. Như bản web.
export const authApi = {
  login: (email: string, password: string) => api.post<AuthTokens>("/auth/login", { email, password }),
  register: (payload: RegisterPayload) => api.post<AuthTokens>("/auth/register", payload),
  socialConfig: () => api.get<SocialConfig>("/auth/social-config"),
  // Google trên Android trả ID token (web dùng access token, endpoint /auth/google); Facebook giống web.
  socialLogin: (provider: SocialProvider, token: string) =>
    provider === "google"
      ? api.post<AuthTokens>("/auth/google/id-token", { idToken: token })
      : api.post<AuthTokens>("/auth/facebook", { accessToken: token }),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  changePasswordAtLogin: (email: string, currentPassword: string, newPassword: string) =>
    api.post<AuthTokens>("/auth/change-password", { email, currentPassword, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<AuthTokens>("/me/password", { currentPassword, newPassword }),
}
