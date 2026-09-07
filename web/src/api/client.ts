/**
 * concept-frontend-v1.md §5.2: đúng một chỗ gọi fetch. Không component nào
 * gọi fetch trực tiếp. Backend hiện chưa cấp JWT (auth chưa xây — xem
 * concept-backend-v1.md), nên chưa có Authorization header hay auto-logout
 * ở 401; thêm khi package auth/ backend có JwtIssuer thật.
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = await res.json()
      detail = body.detail ?? body.message ?? body.error
    } catch {
      // body rỗng hoặc không phải JSON — bỏ qua, dùng statusText
    }
    throw new ApiError(res.status, detail ?? res.statusText, detail)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
