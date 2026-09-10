import { Link, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { AdminHeader } from "@/components/AdminShell"
import { Card } from "@/components/ui/card"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GOALS, labelOf } from "@/features/profile/types"
import { formatDate } from "@/lib/format"
import type { AdminUserRow } from "./useAdminUsers"

type AdminUserDetail = {
  user: AdminUserRow
  goal: string | null
  experience: string | null
  sessionsPerWeek: number | null
  equipment: string[]
  birthYear: number | null
  gender: string | null
  disclaimerAt: string | null
  onboardingStep: string
  heightCm: number | null
  weightKg: number | null
  measuredOn: string | null
  activeProgramName: string | null
}

/** Màn 11 — hồ sơ một người dùng. Chỉ đọc: admin không sửa hồ sơ hộ người dùng. */
export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const detail = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${userId}`),
  })

  if (detail.isLoading) {
    return <p className="p-7 text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if (detail.isError) {
    return <p className="p-7 text-sm text-[var(--color-danger)]">{detail.error.message}</p>
  }

  const d = detail.data!

  return (
    <>
      <AdminHeader group="Theo dõi · người dùng" title={d.user.email}>
        <Link to="/admin/users" className="text-[13px] whitespace-nowrap text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← Danh sách
        </Link>
      </AdminHeader>

      <div className="space-y-4 overflow-auto px-7 py-5.5">
      <Card className="grid gap-3 sm:grid-cols-2">
        <Row label="Vai trò" value={d.user.role} />
        <Row label="Trạng thái" value={d.user.active ? "Đang hoạt động" : "Đã khoá"} />
        <Row label="Ngày tham gia" value={formatDate(d.user.createdAt)} />
        <Row
          label="Hoạt động gần nhất"
          value={d.user.lastActivityAt ? formatDate(d.user.lastActivityAt) : "chưa tập buổi nào"}
        />
      </Card>

      <Card className="grid gap-3 sm:grid-cols-2">
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
