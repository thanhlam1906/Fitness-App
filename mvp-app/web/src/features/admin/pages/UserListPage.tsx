import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { CreateUserDialog } from "@/features/admin/components/CreateUserDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { useAdminOverview, useAdminUsers } from "@/features/admin/api/useAdminUsers"
import { downloadUsersCsv } from "@/features/admin/api/adminUsersApi"
import type { UserStatus } from "@/features/admin/types"
import { ROLE_LABEL, STATUS_LABEL } from "@/features/admin/utils/userLabels"
import {
  applyListPatch,
  nextSort,
  PAGE_SIZE,
  readUserListParams,
  type UserListParams,
  type UserSort,
} from "@/features/admin/utils/userListParams"

const TABS: ["ALL" | UserStatus, string][] = [
  ["ALL", "Tất cả"],
  ["TRAINING", STATUS_LABEL.TRAINING],
  ["NOT_STARTED", STATUS_LABEL.NOT_STARTED],
  ["IDLE", STATUS_LABEL.IDLE],
  ["LOCKED", STATUS_LABEL.LOCKED],
]

const STATUS_TONE: Record<UserStatus, string> = {
  TRAINING: "bg-[var(--color-success-tint)] text-[var(--color-success)]",
  NOT_STARTED: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  IDLE: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  LOCKED: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
}

/**
 * Màn admin Người dùng (doc/design-quan-ly-user-v1.md §6.4). Lọc, tìm, sắp xếp, phân trang đều do
 * server làm; trạng thái nằm trên URL. Không có nút xem video ở bất cứ đâu — và không có endpoint
 * nào trả clip, nên không phải chỉ là ẩn nút.
 */
export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readUserListParams(searchParams)
  const users = useAdminUsers(params)
  const overview = useAdminOverview()
  const [query, setQuery] = useState(params.q)
  const [prevQ, setPrevQ] = useState(params.q)
  const [exportError, setExportError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // URL đổi từ bên ngoài (Back/Forward, link) thì ô tìm kiếm theo URL. Gõ dở không bị ảnh hưởng
  // vì params.q chỉ đổi sau khi timer debounce ghi lên URL.
  if (params.q !== prevQ) {
    setPrevQ(params.q)
    setQuery(params.q)
  }

  function update(patch: Partial<UserListParams>, replace = false) {
    setSearchParams((prev) => applyListPatch(prev, patch), { replace })
  }

  // Gõ tìm kiếm: chờ 300ms ngừng gõ mới gọi server. replace để mỗi từ khoá không thêm một mục lịch sử.
  useEffect(() => {
    if (query === params.q) return
    const t = setTimeout(() => update({ q: query }, true), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chạy lại khi chữ gõ hoặc URL đổi; URL đổi thì timer cũ (giữ setSearchParams cũ) bị huỷ và dựng lại với setter mới nhất, nên không ghi đè tab/vai trò vừa chọn
  }, [query, searchParams.toString()])

  const page = users.data
  const pageCount = page ? Math.max(1, Math.ceil(page.total / PAGE_SIZE)) : 1
  const o = overview.data

  async function exportCsv() {
    setExportError(null)
    try {
      await downloadUsersCsv(params)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Không xuất được CSV")
    }
  }

  return (
    <>
      <AdminHeader group="Theo dõi" title="Người dùng">
        <Input
          type="search"
          placeholder="Tìm theo tên hoặc email"
          className="h-[38px] w-60 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Lọc theo vai trò"
          className="h-[38px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          value={params.role}
          onChange={(e) => update({ role: e.target.value as UserListParams["role"] })}
        >
          <option value="ALL">Mọi vai trò</option>
          <option value="USER">{ROLE_LABEL.USER}</option>
          <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
        </select>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          Xuất CSV
        </Button>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm người dùng
        </Button>
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat
            label="Người tập"
            value={`${o?.traineeCount ?? "—"}`}
            suffix={o ? ` · +${o.newTraineesLast7Days} trong 7 ngày` : undefined}
          />
          <Stat label="Đang tập · 7 ngày" value={`${o?.activeTraineesLast7Days ?? "—"}`} tone="var(--color-success)" />
          <Stat label="Chưa bắt đầu" value={`${o?.notStartedTrainees ?? "—"}`} tone="var(--color-warn)" />
          <Stat label="Buổi tập · 7 ngày" value={`${o?.traineeSessionsLast7Days ?? "—"}`} />
        </div>

        <div className="mt-5.5 flex flex-wrap items-center gap-2.5">
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {TABS.map(([value, label], i) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ status: value })}
                className={cn(
                  "num px-4 py-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]",
                  i > 0 && "border-l border-[var(--color-border)]",
                  params.status === value
                    ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                )}
              >
                {label} {o?.statusCounts[value] ?? ""}
              </button>
            ))}
          </div>
        </div>

        {exportError && <p className="mt-3 text-sm text-[var(--color-danger)]">{exportError}</p>}
        {users.isLoading && <p className="mt-4 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {users.isError && <p className="mt-4 text-sm text-[var(--color-danger)]">{users.error.message}</p>}

        {page && (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)]">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
                  <SortHeader column="email" label="Người dùng" params={params} onSort={(s) => update(s)} />
                  <th className="px-4 py-3 font-normal">Vai trò</th>
                  <SortHeader column="createdAt" label="Tham gia" params={params} onSort={(s) => update(s)} />
                  <SortHeader column="lastActivityAt" label="Hoạt động" params={params} onSort={(s) => update(s)} />
                  <th className="px-4 py-3 font-normal">Chương trình</th>
                  <th className="px-4 py-3 font-normal">Tuần</th>
                  <SortHeader column="sessionCount" label="Buổi" params={params} onSort={(s) => update(s)} right />
                  <th className="px-4 py-3 text-right font-normal">Clip</th>
                  <th className="px-4 py-3 font-normal">Tuân thủ lịch</th>
                  <th className="px-4 py-3 font-normal">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--color-surface-2)] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-[var(--color-accent)] focus-visible:underline"
                        to={`/admin/users/${user.id}`}
                        state={{ back: `/admin/users?${searchParams.toString()}` }}
                      >
                        {user.fullName ?? "—"}
                      </Link>
                      <div className="text-xs text-[var(--color-text-muted)]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">{ROLE_LABEL[user.role]}</td>
                    <td className="num px-4 py-3 text-[var(--color-text-muted)]">{formatDate(user.createdAt)}</td>
                    <td className="num px-4 py-3 text-[var(--color-text-muted)]">
                      {user.lastActivityAt ? formatDate(user.lastActivityAt) : "chưa tập"}
                    </td>
                    <td className="px-4 py-3">{user.programName ?? "—"}</td>
                    <td className="num px-4 py-3 text-[var(--color-text-muted)]">
                      {user.weekIndex == null ? "—" : `${user.weekIndex}/${user.totalWeeks}`}
                    </td>
                    <td className="num px-4 py-3 text-right">{user.sessionCount}</td>
                    <td className="num px-4 py-3 text-right">{user.clipCount}</td>
                    <td className="px-4 py-3">
                      <Adherence pct={user.adherencePct} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                          STATUS_TONE[user.status],
                        )}
                      >
                        {STATUS_LABEL[user.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {page.items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                      Không có người dùng nào khớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {page && (
          <div className="mt-3.5 flex items-center gap-3 text-[13px] text-[var(--color-text-muted)]">
            <span className="num">
              Trang {params.page + 1} / {pageCount} · {page.total} người
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              disabled={params.page === 0}
              onClick={() => update({ page: params.page - 1 })}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={params.page + 1 >= pageCount}
              onClick={() => update({ page: params.page + 1 })}
            >
              Sau
            </Button>
          </div>
        )}

        <p className="mt-3.5 text-xs text-[var(--color-text-muted)]">
          Không có nút xem video ở bất cứ đâu — HLV chỉ đọc verdict và độ tin cậy.
        </p>
      </div>
      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
    </>
  )
}

function SortHeader({
  column,
  label,
  params,
  onSort,
  right,
}: {
  column: UserSort
  label: string
  params: UserListParams
  onSort: (s: Pick<UserListParams, "sort" | "dir">) => void
  right?: boolean
}) {
  const active = params.sort === column
  return (
    <th
      className={cn("px-4 py-3 font-normal", right && "text-right")}
      aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(params, column))}
        className={cn(
          "uppercase hover:text-[var(--color-text)] focus-visible:underline",
          active && "font-bold text-[var(--color-text)]",
        )}
      >
        {label} {active ? (params.dir === "asc" ? "↑" : "↓") : ""}
      </button>
    </th>
  )
}

/** Thanh tuân thủ: xanh khi giữ được lịch, vàng khi tụt, xám khi gần như không tập. */
function Adherence({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[var(--color-text-muted)]">—</span>
  const tone =
    pct >= 70
      ? "var(--color-success)"
      : pct >= 40
        ? "var(--color-warn)"
        : "var(--color-text-muted)"
  return (
    <span className="flex items-center gap-2">
      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
        <span className="block h-full" style={{ width: `${pct}%`, background: tone }} />
      </span>
      <span className="num text-xs text-[var(--color-text-muted)]">{pct}%</span>
    </span>
  )
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string
  value: string
  suffix?: string
  tone?: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4">
      <div className="kicker text-[11px] tracking-[0.08em]">{label}</div>
      <div
        className="num mt-1.5 text-[28px] font-extrabold"
        style={tone ? { color: tone } : undefined}
      >
        {value}
        {suffix && (
          <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">{suffix}</span>
        )}
      </div>
    </div>
  )
}
