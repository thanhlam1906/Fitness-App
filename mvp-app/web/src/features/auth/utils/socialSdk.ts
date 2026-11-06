/**
 * Nạp SDK Google, Facebook bằng thẻ script thay vì thêm thư viện npm (doc/design-dang-nhap-mxh-v1.md §4).
 * Hai hàm lấy token trả null khi người dùng tự đóng cửa sổ: không phải lỗi, không báo gì.
 */

type GoogleTokenResponse = { access_token?: string; error?: string }
type GoogleTokenClient = { requestAccessToken: () => void }
type FbLoginResponse = { authResponse?: { accessToken: string } | null }

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: GoogleTokenResponse) => void
            error_callback?: (err: { type: string }) => void
          }) => GoogleTokenClient
        }
      }
    }
    FB?: {
      init: (config: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }) => void
      login: (cb: (resp: FbLoginResponse) => void, opts: { scope: string; auth_type?: string }) => void
    }
  }
}

const GOOGLE_SDK = "https://accounts.google.com/gsi/client"
const FACEBOOK_SDK = "https://connect.facebook.net/vi_VN/sdk.js"
// Phiên bản Graph API mà SDK web gọi; backend gọi không ghi phiên bản nên theo phiên bản của app trên Meta.
const FACEBOOK_API_VERSION = "v23.0"

const loading = new Map<string, Promise<void>>()

/** Mỗi SDK chỉ nạp một lần; nạp hỏng thì lần bấm sau thử lại. */
function loadScript(src: string): Promise<void> {
  let p = loading.get(src)
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script")
      el.src = src
      el.async = true
      el.onload = () => resolve()
      el.onerror = () => {
        loading.delete(src)
        el.remove()
        reject(new Error("Không tải được trang đăng nhập, kiểm tra mạng rồi thử lại"))
      }
      document.head.appendChild(el)
    })
    loading.set(src, p)
  }
  return p
}

/**
 * Gọi khi trang hiện nút; nút chỉ bật sau khi SDK tải xong. Cửa sổ đăng nhập phải mở ngay trong lúc bấm, chờ tải
 * SDK sau khi bấm thì trình duyệt chặn cửa sổ bật lên (Facebook còn im lặng không báo gì).
 */
export function loadSocialSdk(provider: "google" | "facebook"): Promise<void> {
  return loadScript(provider === "google" ? GOOGLE_SDK : FACEBOOK_SDK)
}

export async function getGoogleAccessToken(clientId: string): Promise<string | null> {
  await loadScript(GOOGLE_SDK)
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (resp) =>
        resp.access_token ? resolve(resp.access_token) : reject(new Error("Google từ chối đăng nhập, thử lại")),
      error_callback: (err) =>
        err.type === "popup_closed" ? resolve(null) : reject(new Error("Không mở được cửa sổ Google, thử lại")),
    })
    client.requestAccessToken()
  })
}

let fbReadyFor: string | null = null

export async function getFacebookAccessToken(appId: string): Promise<string | null> {
  await loadScript(FACEBOOK_SDK)
  if (fbReadyFor !== appId) {
    window.FB!.init({ appId, version: FACEBOOK_API_VERSION, cookie: false, xfbml: false })
    fbReadyFor = appId
  }
  return new Promise((resolve) => {
    window.FB!.login((resp) => resolve(resp.authResponse?.accessToken ?? null), {
      scope: "public_profile,email",
      // Lần trước bỏ tick quyền email thì FB.login không hỏi lại nếu thiếu rerequest, lỗi "không có email" lặp mãi.
      auth_type: "rerequest",
    })
  })
}
