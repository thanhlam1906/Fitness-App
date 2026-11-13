import { clearSession, getAccessToken, getRefreshToken, setTokens } from "~/features/auth/utils/tokenStorage"
import { API_URL } from "~/lib/config"

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

// React Native không có window event như web: báo hết phiên qua danh sách listener trong module.
const loggedOutListeners = new Set<() => void>()

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
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const tokens = await res.json()
        setTokens(tokens.accessToken, tokens.refreshToken)
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

// Trên điện thoại mất Wi-Fi/sai mạng là chuyện thường: fetch ném TypeError tiếng Anh
// "Network request failed" — đổi sang câu người dùng hiểu được.
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra Wi-Fi rồi thử lại.")
  }
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  // /auth/* là endpoint ẩn danh. Gắn access token cũ vào đây thì
  // BearerTokenAuthenticationFilter của Spring chặn NGAY ở tầng xác thực, trước
  // cả khi tới rule permitAll — nên ai còn token hết hạn sẽ
  // không bao giờ đăng nhập lại được, và 401 đó không có body để hiện lý do.
  const accessToken = isAuthEndpoint(path) ? null : getAccessToken()
  // FormData tự đặt Content-Type kèm boundary — set tay là hỏng multipart.
  const isFormData = init?.body instanceof FormData
  const res = await send(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401 && !isRetry && !isAuthEndpoint(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, init, true)
    clearSession()
    loggedOutListeners.forEach((l) => l())
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      // body rỗng hoặc không phải JSON — bỏ qua, dùng statusText
    }
    throw errorFor(res.status, body, res.statusText)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Câu lỗi cho người dùng từ mã trạng thái và body JSON nếu có. Dùng chung cho fetch và XHR gửi video. */
function errorFor(status: number, body: unknown, statusText: string): ApiError {
  let detail: string | undefined
  if (body !== null && typeof body === "object") {
    const fields = body as { detail?: string; message?: string; error?: string }
    detail = fields.detail ?? fields.message ?? fields.error
  }
  // 413 luôn dùng câu tiếng Việt: backend tự chặn thì body JSON mang câu tiếng Anh của Spring.
  const message = status === 413 ? STATUS_MESSAGE_VI[413] : detail ?? STATUS_MESSAGE_VI[status] ?? statusText
  return new ApiError(status, message, detail)
}

// Cloudflare cắt request tải lên kéo dài quá khoảng 125 s (đo thật 10-23, doc/bay-trien-khai-v1.md 2.14).
const UPLOAD_TIMEOUT_MS = 120_000
const UPLOAD_TOO_SLOW = "Mạng chậm quá, video chưa gửi xong. Thử Wi-Fi hoặc quay video ngắn hơn."
const UPLOAD_LOST = "Mất kết nối khi đang gửi. Kiểm tra mạng rồi gửi lại."

export type UploadOptions = { onProgress: (fraction: number) => void; signal: AbortSignal }

/** Hermes của React Native không có DOMException như trình duyệt: tự dựng lỗi cùng tên để màn nhận ra là tự huỷ. */
function abortError(): Error {
  const error = new Error("Đã huỷ gửi")
  error.name = "AbortError"
  return error
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined
  } catch {
    return undefined
  }
}

/**
 * Gửi form kèm tiến độ tải lên (video chấm form), bản mobile của web/src/api/client.ts. fetch không báo được tiến
 * độ tải lên nên chỗ này dùng XHR, vẫn giữ luật của request(): gắn token, 401 thì refresh một lần rồi gửi lại,
 * lỗi ra ApiError câu tiếng Việt.
 */
function upload<T>(path: string, form: FormData, opts: UploadOptions, isRetry = false): Promise<T> {
  return new Promise<XMLHttpRequest>((resolve, reject) => {
    // Bấm Huỷ đúng lúc đang làm mới phiên đăng nhập: lần gửi lại không được bắt đầu. Signal đã huỷ thì không bắn
    // sự kiện abort lần nữa, nên nếu gửi tiếp thì nút Huỷ thành vô dụng.
    if (opts.signal.aborted) {
      reject(abortError())
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_URL}/api/v1${path}`)
    const accessToken = getAccessToken()
    if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    // Mạng tải lên chậm thì Cloudflare cắt mà app không biết, nút đứng mãi: tự dừng trước để còn nói lý do.
    // Không dùng xhr.timeout: trên React Native nó không phải tổng thời gian như trình duyệt (iPhone tính lúc kết nối
    // đứng im giữa hai gói, video vẫn nhích thì không bao giờ dừng; Android hết giờ lại bắn error, ra câu mất mạng).
    const timer = setTimeout(() => {
      reject(new ApiError(0, UPLOAD_TOO_SLOW))
      xhr.abort() // onabort reject lần nữa thì bị bỏ qua vì Promise đã xong
    }, UPLOAD_TIMEOUT_MS)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      clearTimeout(timer)
      resolve(xhr)
    }
    xhr.onerror = () => {
      clearTimeout(timer)
      reject(new ApiError(0, UPLOAD_LOST))
    }
    xhr.onabort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    opts.signal.addEventListener("abort", () => xhr.abort(), { once: true })
    xhr.send(form)
  }).then(async (xhr) => {
    if (xhr.status === 401 && !isRetry) {
      // Cloudflare nhận trọn video rồi mới trả 401: thanh đã 100% nhưng máy chủ chưa nhận gì. Đưa về 0 để nút Huỷ
      // (khoá ở 100%) mở lại trong lúc làm mới phiên, không thì mạng đứt lúc này là người dùng kẹt.
      opts.onProgress(0)
      if (await tryRefresh()) return upload<T>(path, form, opts, true)
      clearSession()
      loggedOutListeners.forEach((l) => l())
    }
    // 524 là Cloudflare chờ quá lâu: với một lần gửi video thì là mạng tải lên chậm, không phải máy chủ hỏng.
    if (xhr.status === 524) throw new ApiError(524, UPLOAD_TOO_SLOW)
    // Đọc chữ rồi tự parse: responseType "json" của React Native không chắc chạy giống trình duyệt.
    const body = parseJson(xhr.responseText)
    if (xhr.status < 200 || xhr.status >= 300) throw errorFor(xhr.status, body, xhr.statusText)
    return body as T
  })
}

export function onLoggedOut(handler: () => void): () => void {
  loggedOutListeners.add(handler)
  return () => {
    loggedOutListeners.delete(handler)
  }
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
  uploadForm: <T>(path: string, form: FormData, opts: UploadOptions) => upload<T>(path, form, opts),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
