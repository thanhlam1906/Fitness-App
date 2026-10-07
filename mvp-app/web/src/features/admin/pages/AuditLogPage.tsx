import { useState } from "react"
import { useAuditLog } from "@/features/admin/api/useAdminUsers"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { AuditLogTable } from "@/features/admin/components/AuditLogTable"

/** Nhật ký quản trị toàn hệ thống — nơi duy nhất còn đọc được thao tác trên tài khoản đã xoá (spec §6.7). */
export function AuditLogPage() {
  const [page, setPage] = useState(0)
  const log = useAuditLog(undefined, page)
  return (
    <>
      <AdminHeader group="Theo dõi" title="Nhật ký quản trị" />
      <div className="overflow-auto px-7 py-5.5">
        {log.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {log.isError && <p className="text-sm text-[var(--color-danger)]">{log.error.message}</p>}
        {log.data && <AuditLogTable page={log.data} showTarget onPage={setPage} />}
      </div>
    </>
  )
}
