import type { UserRole, UserStatus } from "@/features/admin/types"

/**
 * Bộ lọc màn Người dùng nằm trên URL (doc/design-quan-ly-user-v1.md §6.4): từ hồ sơ bấm quay
 * lại thì danh sách giữ nguyên chỗ, và gửi link cho admin khác mở đúng kết quả đó.
 */
export type UserSort = "createdAt" | "lastActivityAt" | "email" | "sessionCount"
export type UserListParams = {
  q: string
  status: "ALL" | UserStatus
  role: "ALL" | UserRole
  sort: UserSort
  dir: "asc" | "desc"
  page: number
}

export const PAGE_SIZE = 20

export const DEFAULT_USER_LIST_PARAMS: UserListParams = {
  q: "",
  status: "ALL",
  role: "ALL",
  sort: "createdAt",
  dir: "desc",
  page: 0,
}

const STATUSES = ["ALL", "TRAINING", "NOT_STARTED", "IDLE", "LOCKED"] as const
const ROLES = ["ALL", "USER", "ADMIN"] as const
const SORTS = ["createdAt", "lastActivityAt", "email", "sessionCount"] as const
const DIRS = ["asc", "desc"] as const

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function readUserListParams(sp: URLSearchParams): UserListParams {
  const d = DEFAULT_USER_LIST_PARAMS
  const page = Number(sp.get("page"))
  return {
    q: sp.get("q") ?? d.q,
    status: pick(sp.get("status"), STATUSES, d.status),
    role: pick(sp.get("role"), ROLES, d.role),
    sort: pick(sp.get("sort"), SORTS, d.sort),
    dir: pick(sp.get("dir"), DIRS, d.dir),
    page: Number.isInteger(page) && page > 0 ? page : d.page,
  }
}

export function writeUserListParams(p: UserListParams): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of ["q", "status", "role", "sort", "dir", "page"] as const) {
    if (p[key] !== DEFAULT_USER_LIST_PARAMS[key]) sp.set(key, String(p[key]))
  }
  return sp
}

export function toUsersApiQuery(p: UserListParams, paged = true): string {
  const sp = new URLSearchParams({ q: p.q, status: p.status, role: p.role, sort: p.sort, dir: p.dir })
  if (paged) {
    sp.set("page", String(p.page))
    sp.set("size", String(PAGE_SIZE))
  }
  return sp.toString()
}

export function nextSort(p: UserListParams, column: UserSort): Pick<UserListParams, "sort" | "dir"> {
  if (p.sort === column) return { sort: column, dir: p.dir === "asc" ? "desc" : "asc" }
  return { sort: column, dir: column === "email" ? "asc" : "desc" }
}
