export type AuthTokens = { accessToken: string; refreshToken: string; userId: string; role: string }
/** null = server chưa cấu hình nhà cung cấp đó, nút hiện "Sắp có". */
export type SocialConfig = { googleClientId: string | null; facebookAppId: string | null }
export type SocialProvider = "google" | "facebook"
