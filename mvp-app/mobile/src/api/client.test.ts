import { clearSession, setSession } from "~/features/auth/utils/tokenStorage"
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

/** XHR giả: test tự bắn các sự kiện mà React Native bắn khi gửi video. */
class FakeXhr {
  static last: FakeXhr
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  }
  url = ""
  status = 0
  statusText = ""
  responseText = ""
  headers: Record<string, string> = {}
  onload: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    FakeXhr.last = this
  }
  open(_method: string, url: string) {
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send() {}
  abort() {
    this.onabort?.()
  }
  respond(status: number, body?: unknown) {
    this.status = status
    this.responseText = body === undefined ? "" : JSON.stringify(body)
    this.onload?.()
  }
}

/**
 * Gửi video qua 4G: Cloudflare cắt request tải lên quá ~125 s (doc/bay-trien-khai-v1.md 2.14), fetch không báo
 * tiến độ nên nút "Đang gửi…" đứng im không biết bao giờ xong. Phải có tiến độ, Huỷ, và câu lỗi rõ như web.
 */
describe("api.uploadForm — gửi video có tiến độ", () => {
  const realXhr = globalThis.XMLHttpRequest
  beforeEach(() => {
    globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest
  })
  afterEach(() => {
    globalThis.XMLHttpRequest = realXhr
  })

  function send(onProgress = jest.fn(), controller = new AbortController()) {
    return api.uploadForm<{ id: string }>("/reviews", new FormData(), { onProgress, signal: controller.signal })
  }

  it("báo tiến độ, gắn token, gọi đúng địa chỉ backend, trả JSON khi xong", async () => {
    setSession("A1", "r", "u", "USER")
    const onProgress = jest.fn()
    const done = send(onProgress)

    FakeXhr.last.upload.onprogress!({ lengthComputable: true, loaded: 25, total: 100 })
    FakeXhr.last.respond(202, { id: "r1" })

    await expect(done).resolves.toEqual({ id: "r1" })
    expect(onProgress).toHaveBeenCalledWith(0.25)
    expect(FakeXhr.last.headers.Authorization).toBe("Bearer A1")
    expect(FakeXhr.last.url).toBe("http://10.0.0.5:8080/api/v1/reviews")
  })

  it("gửi quá lâu thì tự dừng sau 120 s TỔNG, kể cả khi video vẫn nhích, báo mạng chậm thay vì đứng mãi", async () => {
    // xhr.timeout của React Native trên iPhone chỉ tính lúc đứng im: video nhích đều thì không bao giờ dừng.
    jest.useFakeTimers()
    try {
      const done = send()
      const aborted = jest.spyOn(FakeXhr.last, "abort")

      jest.advanceTimersByTime(119_000)
      FakeXhr.last.upload.onprogress!({ lengthComputable: true, loaded: 90, total: 100 })
      jest.advanceTimersByTime(1_000)

      await expect(done).rejects.toThrow(/Mạng chậm/)
      expect(aborted).toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })

  it("xong trước 120 s thì không bị dừng nhầm", async () => {
    jest.useFakeTimers()
    try {
      const done = send()
      FakeXhr.last.respond(202, { id: "r1" })
      const aborted = jest.spyOn(FakeXhr.last, "abort")

      jest.advanceTimersByTime(200_000)

      await expect(done).resolves.toEqual({ id: "r1" })
      expect(aborted).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })

  it("Cloudflare trả 524 cũng là mạng chậm, không phải máy chủ hỏng", async () => {
    const done = send()
    FakeXhr.last.respond(524)

    await expect(done).rejects.toThrow(/Mạng chậm/)
  })

  it("mất mạng giữa chừng nói tiếng Việt", async () => {
    const done = send()
    FakeXhr.last.onerror!()

    await expect(done).rejects.toThrow(/Mất kết nối/)
  })

  it("lỗi có câu của backend thì hiện câu đó", async () => {
    const done = send()
    FakeXhr.last.respond(429, { detail: "Hết lượt tuần này" })

    await expect(done).rejects.toMatchObject({ status: 429, message: "Hết lượt tuần này" })
  })

  it("phiên hết hạn giữa lúc gửi thì tiến độ về 0, nút Huỷ không bị khoá ở 100%", async () => {
    // Cloudflare nhận trọn video rồi mới trả 401: thanh đã lên 100% nhưng máy chủ chưa nhận gì.
    const onProgress = jest.fn()
    const done = send(onProgress)

    FakeXhr.last.upload.onprogress!({ lengthComputable: true, loaded: 100, total: 100 })
    FakeXhr.last.respond(401)

    await expect(done).rejects.toBeInstanceOf(ApiError)
    expect(onProgress.mock.calls.map((call) => call[0])).toEqual([1, 0])
  })

  it("đã huỷ từ trước thì không gửi gì", async () => {
    const controller = new AbortController()
    controller.abort()
    const before = FakeXhr.last

    await expect(send(jest.fn(), controller)).rejects.toMatchObject({ name: "AbortError" })
    expect(FakeXhr.last).toBe(before)
  })

  it("bấm Huỷ thì dừng gửi, lỗi mang tên AbortError dù máy không có DOMException", async () => {
    // Hermes của React Native không có DOMException như trình duyệt: lỗi huỷ phải tự dựng.
    const realDomException = globalThis.DOMException
    // @ts-expect-error xoá tạm để giống môi trường React Native
    delete globalThis.DOMException
    try {
      const controller = new AbortController()
      const done = send(jest.fn(), controller)

      controller.abort()

      await expect(done).rejects.toMatchObject({ name: "AbortError" })
    } finally {
      globalThis.DOMException = realDomException
    }
  })
})
