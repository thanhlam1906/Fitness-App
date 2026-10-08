import { useState } from "react"
import { IconText } from "@/components/StatusViews"
import { Link, useLocation, useParams } from "react-router"
import { useAdminUser, useAuditLog } from "@/features/admin/api/useAdminUsers"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { AuditLogTable } from "@/features/admin/components/AuditLogTable"
import { UserActionsCard } from "@/features/admin/components/UserActionsCard"
import { ROLE_LABEL, STATUS_LABEL } from "@/features/admin/utils/userLabels"
import { useAuth } from "@/features/auth/components/AuthContext"
import { Card } from "@/components/ui/card"
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GOALS, labelOf } from "@/features/profile/types"
import { formatDate } from "@/lib/format"

/**
 * Màn 11 — hồ sơ một người dùng. Admin không sửa hồ sơ hộ người dùng; chỉ quản lý tài khoản
 * (doc/design-quan-ly-user-v1.md §6.5).
 */
export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const location = useLocation()
  const { userId: myId } = useAuth()
  const [auditPage, setAuditPage] = useState(0)
  // Hook phải gọi trước các return sớm bên dưới.
  const detail = useAdminUser(userId)
  const audit = useAuditLog(userId, auditPage)

  if (detail.isLoading) {
    // Khung của trang: header, thẻ tài khoản (2 dòng), thẻ hồ sơ (5 dòng), ghi chú cuối.
    return (
      <>
        <AdminHeader group="Theo dõi · người dùng" title={<Skeleton className="h-6 w-56" />}>
          <Link to="/admin/users" className="text-[13px] whitespace-nowrap text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            ← Danh sách
          </Link>
        </AdminHeader>
        <div role="status" aria-label="Đang tải" className="space-y-4 overflow-auto px-7 py-5.5">
          <Skeleton className="h-[104px]" />
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-4 w-80" />
        </div>
      </>
    )
  }
  if (detail.isError) {
    return <IconText className="p-7">{detail.error.message}</IconText>
  }

  const d = detail.data!

  return (
    <>
      <AdminHeader group="Theo dõi · người dùng" title={d.user.email}>
        <Link to={(location.state as { back?: string } | null)?.back ?? "/admin/users"} className="text-[13px] whitespace-nowrap text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← Danh sách
        </Link>
      </AdminHeader>

      <div className="space-y-4 overflow-auto px-7 py-5.5">
      <Card className="grid gap-3 sm:grid-cols-2">
        <Row label="Vai trò" value={ROLE_LABEL[d.user.role]} />
        <Row label="Trạng thái" value={STATUS_LABEL[d.user.status]} />
        <Row label="Mật khẩu" value={d.mustChangePassword ? "Đang chờ đổi mật khẩu tạm" : "Người dùng tự đặt"} />
        <Row label="Ngày tham gia" value={formatDate(d.user.createdAt)} />
        <Row
          label="Hoạt động gần nhất"
          value={d.user.lastActivityAt ? formatDate(d.user.lastActivityAt) : "chưa tập buổi nào"}
        />
      </Card>

      <Card className="grid gap-3 sm:grid-cols-2">
        <Row label="Họ và tên" value={d.fullName ?? "—"} />
        <Row label="Số điện thoại" value={d.phone ?? "—"} />
        <Row label="Mục tiêu" value={labelOf(GOALS, d.goal)} />
        <Row label="Kinh nghiệm" value={labelOf(EXPERIENCE_LEVELS, d.experience)} />
        <Row label="Số buổi/tuần" value={d.sessionsPerWeek?.toString() ?? "—"} />
        <Row
          label="Thiết bị"
          value={
            d.equipment.length === 0
              ? "—"
              : d.equipment.map((e) => labelOf(EQUIPMENT_OPTIONS, e)).join(", ")
          }
        />
        <Row label="Năm sinh" value={d.birthYear?.toString() ?? "—"} />
        <Row label="Giới tính" value={d.gender ?? "—"} />
        <Row
          label="Chiều cao / cân nặng"
          value={
            d.weightKg == null && d.heightCm == null
              ? "chưa nhập"
              : `${d.heightCm ?? "—"} cm / ${d.weightKg ?? "—"} kg (${d.measuredOn ?? "—"})`
          }
        />
        <Row label="Bước onboarding" value={d.onboardingStep} />
        <Row
          label="Đã đồng ý cam kết"
          value={d.disclaimerAt ? formatDate(d.disclaimerAt) : "chưa"}
        />
        <Row label="Chương trình đang chạy" value={d.activeProgramName ?? "chưa có"} />
      </Card>

      <UserActionsCard user={d.user} isSelf={d.user.id === myId} />

      <h2 className="pt-2 text-sm font-semibold">Lịch sử quản trị</h2>
      {audit.isLoading && <TableSkeleton rows={3} />}
      {audit.isError && <IconText>{audit.error.message}</IconText>}
      {audit.data && <AuditLogTable page={audit.data} showTarget={false} onPage={setAuditPage} />}

      <p className="text-xs text-[var(--color-text-muted)]">
        Web admin không xem clip và không chấm bài — toàn bộ do rule engine thực hiện.
      </p>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="num text-sm">{value}</p>
    </div>
  )
}
