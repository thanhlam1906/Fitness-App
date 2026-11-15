import type { SocialProvider } from "@/features/auth/types"

/**
 * Lấy token từ nút đăng nhập native của Google/Facebook. null = người dùng tự đóng cửa sổ.
 *
 * require trong hàm, không import ở đầu file: thư viện native chỉ có trong bản APK. Import ở đầu thì Expo Go và
 * bản iPhone build trước đợt này sập ngay lúc mở app, không chỉ lúc bấm nút.
 */
export async function getSocialToken(provider: SocialProvider, googleWebClientId: string): Promise<string | null> {
  try {
    return provider === "google" ? await googleIdToken(googleWebClientId) : await facebookAccessToken()
  } catch (e) {
    // Thiếu module native (Expo Go) ném lỗi "could not be found": báo rõ thay vì câu tiếng Anh khó hiểu.
    if (e instanceof Error && /could not be found|TurboModuleRegistry|native module/i.test(e.message)) {
      throw new Error("Đăng nhập Google/Facebook chỉ dùng được trong bản cài APK")
    }
    throw e
  }
}

async function googleIdToken(webClientId: string): Promise<string | null> {
  const { GoogleSignin, isErrorWithCode, statusCodes } =
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin")
  // webClientId = Client ID của WEB: ID token cấp cho nó thì backend kiểm aud như bản web
  // (SocialTokenVerifier.googleIdToken). Client Android chỉ cần tồn tại trong cùng project Google Cloud.
  GoogleSignin.configure({ webClientId })
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const res = await GoogleSignin.signIn()
    if (res.type !== "success") return null
    if (!res.data.idToken) throw new Error("Google không trả mã đăng nhập, thử lại")
    return res.data.idToken
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return null
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Máy này thiếu Google Play Services nên không đăng nhập Google được")
    }
    throw e
  } finally {
    // Quên tài khoản vừa chọn: lần sau (đăng xuất rồi vào lại) Google hỏi chọn tài khoản, không tự lấy lại người cũ.
    GoogleSignin.signOut().catch(() => {})
  }
}

async function facebookAccessToken(): Promise<string | null> {
  const { NativeModules } = require("react-native") as typeof import("react-native")
  // fbsdk đọc thẳng NativeModules.FBLoginManager: thiếu (Expo Go) thì nó ném TypeError tiếng Anh, không phải "could not be found".
  if (!NativeModules.FBLoginManager) throw new Error("Đăng nhập Google/Facebook chỉ dùng được trong bản cài APK")
  const { AccessToken, LoginManager } = require("react-native-fbsdk-next") as typeof import("react-native-fbsdk-next")
  try {
    const res = await LoginManager.logInWithPermissions(["public_profile", "email"])
    if (res.isCancelled) return null
    return (await AccessToken.getCurrentAccessToken())?.accessToken ?? null
  } finally {
    // Giống Google: không giữ phiên Facebook trong app, server đã cấp token riêng của VFit.
    LoginManager.logOut()
  }
}
