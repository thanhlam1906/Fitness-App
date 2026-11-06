import { api } from "@/api/client"
import type { AuthTokens, SocialConfig, SocialProvider } from "@/features/auth/types"
import type { RegisterPayload } from "@/features/auth/types/registerSchema"

// Hàm thường, không phải hook: AuthContext gọi trong login/register/logout của nó.
export const authApi = {
  login: (email: string, password: string) => api.post<AuthTokens>("/auth/login", { email, password }),
  register: (payload: RegisterPayload) => api.post<AuthTokens>("/auth/register", payload),
  socialConfig: () => api.get<SocialConfig>("/auth/social-config"),
  socialLogin: (provider: SocialProvider, accessToken: string) =>
    api.post<AuthTokens>(`/auth/${provider}`, { accessToken }),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  changePasswordAtLogin: (email: string, currentPassword: string, newPassword: string) =>
    api.post<AuthTokens>("/auth/change-password", { email, currentPassword, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<AuthTokens>("/me/password", { currentPassword, newPassword }),
}
