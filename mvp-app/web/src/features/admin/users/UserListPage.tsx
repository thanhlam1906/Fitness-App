import { useState } from "react"
import { Link } from "react-router"
import { AdminHeader } from "@/components/AdminShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { useAdminOverview, useAdminUsers, type AdminUserRow } from "./useAdminUsers"

/** Đợt thử nghiệm MVP giới hạn 100 người — con số này nằm ở đặc tả, không phải API. */
const TRIAL_SEATS = 100

type Filter = "ALL" | "TRAINING" | "IDLE" | "LOCKED"

/**
 * Màn 11 concept-frontend-v1.md — danh sách người dùng cho admin.
 * "Không có nút xem video ở bất cứ đâu" — và cũng không có endpoint nào trả về
 * clip hay kết quả chấm, nên không phải chỉ là ẩn nút.
 *
 * Cột Chương trình / Tuần / Buổi / Clip / Tuân thủ lịch lấy từ `GET /admin/users`;
 * bốn ô thống kê lấy từ `GET /admin/overview`.
 */
export function UserListPage() {
  const users = useAdminUsers()
  const overview = useAdminOverview()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("ALL")

  const rows = users.data ?? []
  const counts = {
    ALL: rows.length,
    TRAINING: rows.filter((u) => u.active && withinDays(u.lastActivityAt, 7)).length,
    IDLE: rows.filter((u) => u.active && !withinDays(u.lastActivityAt, 7)).length,
    LOCKED: rows.filter((u) => !u.active).length,
  }

  const needle = query.trim().toLowerCase()
  const visible = rows.filter((user) => {
    if (filter === "LOCKED" && user.active) return false
    if (filter === "TRAINING" && (!user.active || !withinDays(user.lastActivityAt, 7))) return false
    if (filter === "IDLE" && (!user.active || withinDays(user.lastActivityAt, 7))) return false
    return needle === "" || user.email.toLowerCase().includes(needle)
  })

  return (
    <>
      <AdminHeader group="Theo dõi" title="Người dùng thử nghiệm">
        <Input
          type="search"
          placeholder="Tìm theo email"
          className="h-[38px] w-60 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button size="sm" variant="secondary" onClick={() => downloadCsv(visible)}>
          Xuất CSV
        </Button>
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat
            label="Chỗ đã dùng"
            value={`${overview.data?.userCount ?? rows.length}`}
            suffix={` / ${TRIAL_SEATS}`}
          />
          <Stat
            label="Hoạt động 7 ngày"
            value={`${overview.data?.activeLast7Days ?? "—"}`}
            tone="var(--color-success)"
          />
          <Stat label="Buổi tập 7 ngày" value={`${overview.data?.sessionsThisWeek ?? "—"}`} />
          <Stat
            label="Clip chờ chấm"
            value={`${overview.data?.reviewsInQueue ?? "—"}`}
            tone="var(--color-warn)"
          />
        </div>

        <div className="mt-5.5 flex items-center gap-2.5">
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {(
              [
                ["ALL", "Tất cả"],
                ["TRAINING", "Đang tập"],
                ["IDLE", "Bỏ dở"],
                ["LOCKED", "Đã khoá"],
              ] as const
            ).map(([value, label], i) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "num px-4 py-2.5 text-[13px]",
                  i > 0 && "border-l border-[var(--color-border)]",
                  filter === value
                    ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                )}
              >
                {label} {counts[value]}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <span className="num text-[13px] text-[var(--color-text-muted)]">
            {visible.length} dòng · sắp theo ngày tham gia
          </span>
        </div>

        {users.isLoading && <p className="mt-4 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {users.isError && (
          <p className="mt-4 text-sm text-[var(--color-danger)]">{users.error.message}</p>
        )}

        {users.data && (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Tham gia</th>
                  <th className="px-4 py-3 font-normal">Hoạt động</th>
                  <th className="px-4 py-3 font-normal">Chương trình</th>
                  <th className="px-4 py-3 font-normal">Tuần</th>
                  <th className="px-4 py-3 text-right font-normal">Buổi</th>
                  <th className="px-4 py-3 text-right font-normal">Clip</th>
                  <th className="px-4 py-3 font-normal">Tuân thủ lịch</th>
                  <th className="px-4 py-3 font-normal">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--color-surface-2)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link className="text-[var(--color-accent)]" to={`/admin/users/${user.id}`}>
                        {user.email}
                      </Link>
                    </td>
                    <td className="num px-4 py-3 text-[var(--color-text-muted)]">
                      {formatDate(user.createdAt)}
                    </td>
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
                          !user.active
                            ? "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                            : withinDays(user.lastActivityAt, 7)
                              ? "bg-[var(--color-success-tint)] text-[var(--color-success)]"
                              : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                        )}
                      >
                        {!user.active
                          ? "Đã khoá"
                          : withinDays(user.lastActivityAt, 7)
                            ? "Đang tập"
                            : "Bỏ dở"}
                      </span>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                      Không có người dùng nào khớp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3.5 text-xs text-[var(--color-text-muted)]">
          Không có nút xem video ở bất cứ đâu — HLV chỉ đọc verdict và độ tin cậy.
        </p>
      </div>
    </>
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

function withinDays(iso: string | null, days: number): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000
}

/** Xuất đúng những dòng đang hiện — không gọi API, chỉ đóng gói lại dữ liệu đã tải. */
function downloadCsv(rows: AdminUserRow[]) {
  const header = [
    "email",
    "tham_gia",
    "hoat_dong_gan_nhat",
    "chuong_trinh",
    "tuan",
    "buoi",
    "clip",
    "tuan_thu_pct",
    "trang_thai",
  ]
  const body = rows.map((u) => [
    u.email,
    u.createdAt,
    u.lastActivityAt ?? "",
    u.programName ?? "",
    u.weekIndex == null ? "" : `${u.weekIndex}/${u.totalWeeks}`,
    u.sessionCount,
    u.clipCount,
    u.adherencePct ?? "",
    u.active ? "active" : "locked",
  ])
  const csv = [header, ...body]
    .map((cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `nguoi-dung-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
