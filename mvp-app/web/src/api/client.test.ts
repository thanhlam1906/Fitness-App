import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "./client"

const STATUS_TEXT: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
  418: "I'm a teapot",
  502: "Bad Gateway",
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

/**
 * 500 là lỗi chưa ai bắt: Spring (include-message: always) đưa nguyên câu của exception vào body,
 * có khi kèm câu SQL, tên bảng, cả email. Câu tiếng Việt có chủ đích ở 5xx đi bằng mã khác.
 */
describe("api client — lỗi máy chủ", () => {
  it("500 không lộ câu của exception", async () => {
    const error = await failedRequest(500, {
      error: "Internal Server Error",
      message: 'could not execute statement [duplicate key value violates unique constraint "users_email_key"]',
    })

    expect(error.message).toBe("Máy chủ gặp lỗi. Thử lại sau ít phút.")
    expect(error.detail).toBeUndefined()
  })

  it("503 mang câu tiếng Việt có chủ đích thì giữ", async () => {
    const error = await failedRequest(503, { message: "Trợ lý đang gián đoạn, bạn thử lại sau ít phút." })

    expect(error.message).toBe("Trợ lý đang gián đoạn, bạn thử lại sau ít phút.")
  })

  it("502 không có body (trang HTML của nginx) nói tiếng Việt, không phải statusText", async () => {
    const error = await failedRequest(502)

    expect(error.message).toBe("Máy chủ gặp lỗi. Thử lại sau ít phút.")
  })
})

/** localStorage ghi được, để thấy client đổi token. */
function storeSession(access: string, refresh: string) {
  const store: Record<string, string> = { "fitness.accessToken": access, "fitness.refreshToken": refresh }
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  })
  return store
}

/** Mỗi lần gọi fetch lấy response kế tiếp trong danh sách. */
function respondInOrder(...responses: { status: number; body?: unknown }[]) {
  let i = 0
  const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => {
    const { status, body } = responses[i++]
    return { ok: status >= 200 && status < 300, status, statusText: "", json: async () => body ?? {} }
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/**
 * Hai tab cùng hết hạn access token cùng gửi một refresh token. Tab thắng được cặp mới, tab thua
 * nhận 401 (token đã xoay) và xoá luôn cặp mới của tab thắng: người dùng bị đăng xuất ngẫu nhiên.
 */
describe("api client — refresh khi mở nhiều tab", () => {
  it("tab khác đã xoay token lúc chờ khoá: không gửi refresh token cũ, gọi lại bằng access token mới", async () => {
    const store = storeSession("A1", "R1")
    const fetchMock = respondInOrder({ status: 401 }, { status: 200 })
    vi.stubGlobal("navigator", {
      locks: {
        request: async (_name: string, fn: () => Promise<boolean>) => {
          // Tab kia giữ khoá và xoay xong trước khi tới lượt tab này.
          store["fitness.accessToken"] = "A2"
          store["fitness.refreshToken"] = "R2"
          return fn()
        },
      },
    })

    await api.get("/schedule")

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/v1/schedule", "/api/v1/schedule"])
    expect(authHeaderOf(fetchMock, 1)).toBe("Bearer A2")
    expect(store["fitness.refreshToken"]).toBe("R2")
  })

  it("trình duyệt không có Web Locks (http thường) vẫn refresh như trước", async () => {
    const store = storeSession("A1", "R1")
    const fetchMock = respondInOrder(
      { status: 401 },
      { status: 200, body: { accessToken: "A2", refreshToken: "R2" } },
      { status: 200 },
    )
    vi.stubGlobal("navigator", {})

    await api.get("/schedule")

    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/refresh")
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ refreshToken: "R1" }))
    expect(authHeaderOf(fetchMock, 2)).toBe("Bearer A2")
    expect(store["fitness.refreshToken"]).toBe("R2")
  })

  it("tab khác xoay token mà tab này thấy chậm: refresh 401 nhưng máy đã có cặp mới thì dùng, không đăng xuất", async () => {
    const store = storeSession("A1", "R1")
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/refresh") {
        // Thay đổi của tab kia tới nơi khi tab này đã gửi R1 (đã bị thu hồi).
        store["fitness.accessToken"] = "A2"
        store["fitness.refreshToken"] = "R2"
        return { ok: false, status: 401, statusText: "", json: async () => ({}) }
      }
      const ok = fetchMock.mock.calls.length > 1
      return { ok, status: ok ? 200 : 401, statusText: "", json: async () => ({}) }
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("navigator", {})

    await api.get("/schedule")

    expect(authHeaderOf(fetchMock, 2)).toBe("Bearer A2")
    expect(store["fitness.refreshToken"]).toBe("R2")
  })

  it("đăng xuất lúc đang refresh: không ghi cặp token vừa nhận vào máy", async () => {
    const store = storeSession("A1", "R1")
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/refresh") {
        delete store["fitness.accessToken"]
        delete store["fitness.refreshToken"]
        return { ok: true, status: 200, statusText: "", json: async () => ({ accessToken: "A2", refreshToken: "R2" }) }
      }
      return { ok: false, status: 401, statusText: "", json: async () => ({}) }
    }))
    vi.stubGlobal("navigator", {})

    await expect(api.get("/schedule")).rejects.toBeInstanceOf(ApiError)

    expect(store["fitness.refreshToken"]).toBeUndefined()
    expect(store["fitness.accessToken"]).toBeUndefined()
  })
})
