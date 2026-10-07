import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import type { AdminAuditEntry, AdminPage } from "@/features/admin/types"
import { ACTION_LABEL, ROLE_LABEL } from "@/features/admin/utils/userLabels"

function describe(e: AdminAuditEntry): string {
  if (e.action === "CHANGE_ROLE" && e.detail) {
    return `${ROLE_LABEL[e.detail.from as "USER" | "ADMIN"] ?? e.detail.from} → ${ROLE_LABEL[e.detail.to as "USER" | "ADMIN"] ?? e.detail.to}`
  }
  if (e.action === "CREATE" && e.detail) return ROLE_LABEL[e.detail.role as "USER" | "ADMIN"] ?? e.detail.role
  return e.reason ?? ""
}

/** Bảng nhật ký dùng chung cho hồ sơ (một tài khoản) và trang Nhật ký quản trị (toàn hệ thống). */
export function AuditLogTable({
  page,
  showTarget,
  onPage,
}: {
  page: AdminPage<AdminAuditEntry>
  showTarget: boolean
  onPage: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(page.total / page.size))
  return (
    <div>
      <div className="overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[10px] tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
              <th className="px-4 py-3 font-normal">Thời gian</th>
              <th className="px-4 py-3 font-normal">Người làm</th>
              <th className="px-4 py-3 font-normal">Thao tác</th>
              {showTarget && <th className="px-4 py-3 font-normal">Tài khoản</th>}
              <th className="px-4 py-3 font-normal">Lý do / chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((e) => (
              <tr key={e.id} className="border-b border-[var(--color-surface-2)] last:border-0">
                <td className="num px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">
                  {new Date(e.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-4 py-3">{e.actorEmail}</td>
                <td className="px-4 py-3">{ACTION_LABEL[e.action]}</td>
                {showTarget && (
                  <td className="px-4 py-3">
                    {e.targetId ? (
                      <Link className="text-[var(--color-accent)] focus-visible:underline" to={`/admin/users/${e.targetId}`}>
                        {e.targetEmail}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">{e.targetEmail} (đã xoá)</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{describe(e)}</td>
              </tr>
            ))}
            {page.items.length === 0 && (
              <tr>
                <td colSpan={showTarget ? 5 : 4} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  Chưa có thao tác nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center gap-3 text-[13px] text-[var(--color-text-muted)]">
          <span className="num">
            Trang {page.page + 1} / {pageCount}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" disabled={page.page === 0} onClick={() => onPage(page.page - 1)}>
            Trước
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page.page + 1 >= pageCount}
            onClick={() => onPage(page.page + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
