import { clearSession, setSession } from "~/auth/tokenStorage"
import { api, ApiError, onLoggedOut } from "./client"

type Reply = { status: number; body?: unknown }

/** Trả lần lượt từng câu trả lời cho mỗi lần gọi fetch. Body rỗng thì json() ném — như thật. */
function respond(...replies: Reply[]) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => {
    const r = replies.shift()!
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: "",
      json: async () => {
        if (r.body === undefined) throw new SyntaxError("Unexpected end of JSON input")
        return r.body
      },
    }
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const authOf = (m: jest.Mock, i = 0) =>
  (m.mock.calls[i]?.[1]?.headers as Record<string, string> | undefined)?.Authorization

beforeEach(() => clearSession())

it("gọi đúng địa chỉ backend theo IP máy chạy Metro", async () => {
  const m = respond({ status: 200, body: {} })
  await api.get("/schedule")
  expect(m.mock.calls[0][0]).toBe("http://10.0.0.5:8080/api/v1/schedule")
})

// Spring chặn Bearer hỏng ngay ở tầng xác thực, kể cả /auth/login — bug thật bên web.
it("KHÔNG gắn token vào /auth/login dù còn token cũ", async () => {
  setSession("cu", "r", "u", "USER")
  const m = respond({ status: 200, body: {} })
  await api.post("/auth/login", {})
  expect(authOf(m)).toBeUndefined()
})

it("gắn token cho endpoint thường", async () => {
  setSession("a", "r", "u", "USER")
  const m = respond({ status: 200, body: {} })
  await api.get("/schedule")
  expect(authOf(m)).toBe("Bearer a")
})

it("401 thì refresh đúng một lần rồi gọi lại với token mới", async () => {
  setSession("het-han", "r1", "u", "USER")
  const m = respond(
    { status: 401 },
    { status: 200, body: { accessToken: "moi", refreshToken: "r2" } },
    { status: 200, body: { ok: true } },
  )
  await expect(api.get("/schedule")).resolves.toEqual({ ok: true })
  expect(m.mock.calls[1][0]).toBe("http://10.0.0.5:8080/api/v1/auth/refresh")
  expect(authOf(m, 2)).toBe("Bearer moi")
})

it("refresh hỏng thì xoá phiên và báo hết phiên", async () => {
  setSession("het-han", "r1", "u", "USER")
  const handler = jest.fn()
  const off = onLoggedOut(handler)
  respond({ status: 401 }, { status: 401 })
  await expect(api.get("/schedule")).rejects.toBeInstanceOf(ApiError)
  expect(handler).toHaveBeenCalledTimes(1)
  off()
})

it("lỗi body rỗng hiện câu tiếng Việt", async () => {
  respond({ status: 403 })
  await expect(api.get("/x")).rejects.toMatchObject({
    status: 403,
    message: "Tài khoản này không có quyền làm việc đó.",
  })
})

it("mất mạng hiện câu tiếng Việt thay cho 'Network request failed'", async () => {
  globalThis.fetch = jest.fn(async () => {
    throw new TypeError("Network request failed")
  }) as unknown as typeof fetch
  await expect(api.get("/x")).rejects.toMatchObject({
    status: 0,
    message: "Không kết nối được máy chủ. Kiểm tra Wi-Fi rồi thử lại.",
  })
})
