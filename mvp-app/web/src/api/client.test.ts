import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "./client"

const STATUS_TEXT: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
  418: "I'm a teapot",
}

/**
 * jsdom ở cấu hình này không dựng được `Response` lẫn `localStorage`, nên stub
 * đúng những gì client đụng tới. Body rỗng thì `json()` ném — giống trình duyệt.
 */
function respondWith(status: number, body?: unknown) {
  const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: STATUS_TEXT[status] ?? "",
    json: async () => {
      if (body === undefined) throw new SyntaxError("Unexpected end of JSON input")
      return body
    },
  }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function storeTokens(accessToken: string | null) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === "fitness.accessToken" ? accessToken : null),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  })
}

/** Header Authorization của lần gọi fetch thứ `index`. */
function authHeaderOf(fetchMock: ReturnType<typeof respondWith>, index = 0): string | undefined {
  const init = fetchMock.mock.calls[index]?.[1]
  return (init?.headers as Record<string, string> | undefined)?.Authorization
}

beforeEach(() => storeTokens(null))
afterEach(() => vi.unstubAllGlobals())

/**
 * Spring dựng `BearerTokenAuthenticationFilter` TRƯỚC tầng phân quyền: hễ có
 * header Bearer hỏng là 401 ngay, kể cả với endpoint permitAll như /auth/login.
 * Nên ai còn token hết hạn trong localStorage mà client vẫn gắn vào request
 * đăng nhập thì bị khoá ngoài vĩnh viễn — chỉ thoát ra bằng cách tự xoá
 * localStorage. Đây là bug đã gặp thật, không phải phòng xa.
 */
describe("api client — gắn Authorization", () => {
  it("KHÔNG gắn token vào /auth/login dù localStorage còn token", async () => {
    storeTokens("token-cu-het-han")
    const fetchMock = respondWith(200, { accessToken: "moi" })

    await api.post("/auth/login", { email: "a@b.c", password: "x" })

    expect(authHeaderOf(fetchMock)).toBeUndefined()
  })

  it("KHÔNG gắn token vào /auth/register và /auth/refresh", async () => {
    storeTokens("token-cu-het-han")
    const fetchMock = respondWith(200, {})

    await api.post("/auth/register", {})
    await api.post("/auth/refresh", {})

    expect(authHeaderOf(fetchMock, 0)).toBeUndefined()
    expect(authHeaderOf(fetchMock, 1)).toBeUndefined()
  })

  it("VẪN gắn token vào endpoint thường", async () => {
    storeTokens("token-con-han")
    const fetchMock = respondWith(200, {})

    await api.get("/schedule")

    expect(authHeaderOf(fetchMock)).toBe("Bearer token-con-han")
  })
})

/** Gọi một endpoint /auth/ (bỏ qua nhánh thử refresh) và trả về lỗi đã ném. */
async function failedRequest(status: number, body?: unknown): Promise<ApiError> {
  respondWith(status, body)
  try {
    await api.post("/auth/login", {})
  } catch (e) {
    if (e instanceof ApiError) return e
    throw e
  }
  throw new Error(`request lẽ ra phải ném ApiError cho status ${status}`)
}

/**
 * Spring Security chặn ở filter thì trả 401/403 với body RỖNG — không có
 * `message` nào để hiện. Trước khi sửa, người dùng đọc được chữ "Unauthorized"
 * giữa một app tiếng Việt và không biết phải làm gì tiếp.
 */
describe("api client — thông báo lỗi", () => {
  it("401 body rỗng nói tiếng Việt, không phải statusText", async () => {
    const error = await failedRequest(401)

    expect(error.status).toBe(401)
    expect(error.message).toContain("Phiên đăng nhập đã hết hạn")
    expect(error.message).not.toContain("Unauthorized")
  })

  it("403 body rỗng nói rõ là thiếu quyền", async () => {
    const error = await failedRequest(403)

    expect(error.message).toContain("không có quyền")
  })

  it("message của backend luôn thắng thông báo mặc định", async () => {
    const error = await failedRequest(401, {
      error: "Unauthorized",
      message: "Sai email hoặc mật khẩu",
    })

    expect(error.message).toBe("Sai email hoặc mật khẩu")
  })

  it("status lạ không có trong bản đồ thì vẫn rơi về statusText, không rỗng", async () => {
    const error = await failedRequest(418)

    expect(error.status).toBe(418)
    expect(error.message).toBeTruthy()
  })
})
