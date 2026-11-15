import { getSocialToken } from "./socialSdk"

const mockGoogle = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(),
  signOut: jest.fn(async () => null),
}
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: mockGoogle,
  isErrorWithCode: (e: unknown) => typeof e === "object" && e !== null && "code" in e,
  statusCodes: { SIGN_IN_CANCELLED: "CANCELLED", PLAY_SERVICES_NOT_AVAILABLE: "NO_PLAY" },
}))

const mockFacebook = {
  logInWithPermissions: jest.fn(),
  logOut: jest.fn(),
  getCurrentAccessToken: jest.fn(),
}
jest.mock("react-native-fbsdk-next", () => ({
  LoginManager: { logInWithPermissions: mockFacebook.logInWithPermissions, logOut: mockFacebook.logOut },
  AccessToken: { getCurrentAccessToken: mockFacebook.getCurrentAccessToken },
}))

const { NativeModules } = jest.requireActual("react-native") as typeof import("react-native")

beforeEach(() => {
  jest.clearAllMocks()
  NativeModules.FBLoginManager = {}
})

test("Google: dùng Client ID web, trả ID token, rồi quên tài khoản vừa chọn", async () => {
  mockGoogle.signIn.mockResolvedValue({ type: "success", data: { idToken: "idt" } })

  await expect(getSocialToken("google", "web-client")).resolves.toBe("idt")
  expect(mockGoogle.configure).toHaveBeenCalledWith({ webClientId: "web-client" })
  expect(mockGoogle.signOut).toHaveBeenCalled()
})

test("Google: người dùng đóng cửa sổ thì trả null, không báo lỗi", async () => {
  mockGoogle.signIn.mockResolvedValue({ type: "cancelled", data: null })
  await expect(getSocialToken("google", "web-client")).resolves.toBeNull()

  mockGoogle.signIn.mockRejectedValue({ code: "CANCELLED" })
  await expect(getSocialToken("google", "web-client")).resolves.toBeNull()
})

test("Google: thiếu Play Services và thiếu module native báo câu tiếng Việt", async () => {
  mockGoogle.signIn.mockRejectedValue({ code: "NO_PLAY" })
  await expect(getSocialToken("google", "w")).rejects.toThrow("thiếu Google Play Services")

  mockGoogle.signIn.mockRejectedValue(new Error("TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found"))
  await expect(getSocialToken("google", "w")).rejects.toThrow("chỉ dùng được trong bản cài APK")
})

test("Facebook: trả access token; huỷ thì null; luôn đăng xuất phiên Facebook", async () => {
  mockFacebook.logInWithPermissions.mockResolvedValue({ isCancelled: false })
  mockFacebook.getCurrentAccessToken.mockResolvedValue({ accessToken: "fbt" })
  await expect(getSocialToken("facebook", "")).resolves.toBe("fbt")

  mockFacebook.logInWithPermissions.mockResolvedValue({ isCancelled: true })
  await expect(getSocialToken("facebook", "")).resolves.toBeNull()
  expect(mockFacebook.logOut).toHaveBeenCalledTimes(2)
})

test("Facebook: thiếu module native (Expo Go) báo câu tiếng Việt", async () => {
  delete NativeModules.FBLoginManager
  await expect(getSocialToken("facebook", "")).rejects.toThrow("chỉ dùng được trong bản cài APK")
  expect(mockFacebook.logInWithPermissions).not.toHaveBeenCalled()
})
