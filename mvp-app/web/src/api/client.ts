import { clearSession, getAccessToken, getRefreshToken, setTokens } from "@/features/auth/utils/tokenStorage"

/**
 * concept-frontend-v1.md §5.2: đúng một chỗ gọi fetch. Không component nào
 * gọi fetch trực tiếp. Gắn Authorization từ access token đang lưu; 401 thì
 * thử refresh đúng MỘT lần rồi gọi lại, refresh cũng fail thì xoá token và
 * bắn sự kiện cho AuthContext biết để điều hướng về /login — module này
 * không import React nên không tự điều hướng được.
 */
export class ApiError extends Error {
  status: number
  detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

const LOGGED_OUT_EVENT = "fitness:logged-out"

/**
 * Backend trả body rỗng cho phần lớn lỗi do Spring Security chặn (401/403 chưa
 * vào tới controller). Không có bản đồ này thì người dùng đọc được đúng
 * `res.statusText` — "Unauthorized", "Forbidden" — tiếng Anh giữa một app
 * tiếng Việt, và không nói được phải làm gì tiếp.
 */
const STATUS_MESSAGE_VI: Record<number, string> = {
  400: "Dữ liệu gửi lên không hợp lệ.",
  401: "Phiên đăng nhập đã hết hạn. Đăng nhập lại.",
  403: "Tài khoản này không có quyền làm việc đó.",
  404: "Không tìm thấy dữ liệu.",
  409: "Dữ liệu bị trùng với thứ đã có.",
  // Cloudflare (trên 100 MB) hay nginx trả 413 bằng trang HTML, không có câu nào đọc được.
  413: "Dữ liệu gửi lên quá nặng. Bỏ bớt hoặc quay clip ngắn hơn.",
  429: "Đã dùng hết lượt cho phép, thử lại sau.",
  500: "Máy chủ gặp lỗi. Thử lại sau ít phút.",
  503: "Máy chủ đang bận. Thử lại sau ít phút.",
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith("/auth/")
}

let refreshInFlight: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async () => {
      // Tab khác đã xoay token lúc tab này chờ khoá: dùng luôn cặp mới. Gửi token cũ thì backend trả 401
      // (token đã thu hồi), và tab này xoá mất cặp mới của tab kia.
      if (getRefreshToken() !== refreshToken) return getRefreshToken() !== null
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
        // Token trong máy đổi lúc chờ trả lời: người dùng đăng xuất (không ghi lại cặp vừa nhận, phiên không
        // được sống lại ngầm), hoặc tab khác đã xoay mà tab này thấy chậm (localStorage báo sang tab khác
        // không đồng bộ ngay; backend trả 401 cho token cũ). Dùng thứ đang có trong máy.
        if (getRefreshToken() !== refreshToken) return getRefreshToken() !== null
        if (!res.ok) return false
        const tokens = await res.json()
        setTokens(tokens.accessToken, tokens.refreshToken)
        return true
      } catch {
        return false
      }
    }).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

// refreshInFlight chỉ gom trong một tab. Khoá này chung mọi tab cùng origin: hai tab cùng hết hạn access
// token thì refresh lần lượt. Web Locks chỉ có trên HTTPS và localhost; mở qua http trên LAN thì chạy không khoá.
function withRefreshLock(refresh: () => Promise<boolean>): Promise<boolean> {
  return navigator.locks ? navigator.locks.request("fitness-refresh", refresh) : refresh()
}

async function request<T>(path: string, init?: RequestInit, isRetry = false, as: "json" | "blob" = "json"): Promise<T> {
  // /auth/* là endpoint ẩn danh. Gắn access token cũ vào đây thì
  // BearerTokenAuthenticationFilter của Spring chặn NGAY ở tầng xác thực, trước
  // cả khi tới rule permitAll — nên ai còn token hết hạn trong localStorage sẽ
  // không bao giờ đăng nhập lại được, và 401 đó không có body để hiện lý do.
  const accessToken = isAuthEndpoint(path) ? null : getAccessToken()
  // FormData tự đặt Content-Type kèm boundary — set tay là hỏng multipart.
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401 && !isRetry && !isAuthEndpoint(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, init, true, as)
    clearSession()
    window.dispatchEvent(new Event(LOGGED_OUT_EVENT))
  }

  if (!res.ok) {
    let detail: string | undefined
    // 500 là lỗi chưa ai bắt: Spring đưa nguyên câu của exception (câu SQL, tên bảng, lớp Java) vào body.
    // Không đọc body để câu đó không tới tay người dùng. Câu tiếng Việt có chủ đích ở 5xx đi bằng 502, 503.
    if (res.status !== 500) {
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? body.error
      } catch {
        // body rỗng hoặc không phải JSON — bỏ qua, dùng statusText
      }
    }
    // 413 luôn dùng câu tiếng Việt: backend tự chặn thì body JSON mang câu tiếng Anh của Spring.
    // 5xx không có câu (nginx, Cloudflare trả trang HTML) thì nói chung là máy chủ lỗi, không hiện "Bad Gateway".
    const message =
      res.status === 413
        ? STATUS_MESSAGE_VI[413]
        : detail ?? STATUS_MESSAGE_VI[res.status] ?? (res.status >= 500 ? STATUS_MESSAGE_VI[500] : res.statusText)
    throw new ApiError(res.status, message, detail)
  }

  if (res.status === 204) return undefined as T
  if (as === "blob") return (await res.blob()) as T
  return (await res.json()) as T
}

export function onLoggedOut(handler: () => void): () => void {
  window.addEventListener(LOGGED_OUT_EVENT, handler)
  return () => window.removeEventListener(LOGGED_OUT_EVENT, handler)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }),
  // DELETE có body: xoá tài khoản phải kèm lý do (doc/design-quan-ly-user-v1.md §5).
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
  /** File tải về (CSV) — vẫn đi qua đây để có Authorization và luồng refresh. */
  getBlob: (path: string) => request<Blob>(path, undefined, false, "blob"),
}
