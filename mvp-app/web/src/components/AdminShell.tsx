import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { useAuth } from "@/auth/AuthContext"
import { useExercises } from "@/features/admin/exercises/useExercises"
import { useTemplates } from "@/features/admin/templates/useTemplates"
import { useAdminOverview, useAdminUsers } from "@/features/admin/users/useAdminUsers"
import { cn } from "@/lib/cn"

type Item = {
  label: string
  to?: string
  count?: number
  /** Màu chấm đầu dòng — design tô cảnh báo cho hàng đợi và góp ý bị báo sai. */
  dot?: string
}

/**
 * Bản admin là sản phẩm thật (§0 concept-frontend-v1.md), nên nó có khung riêng:
 * sidebar 248px chia nhóm, không dùng chung thanh nav với bản user.
 *
 * "Hàng đợi phân tích" và "Góp ý bị báo sai" đã có số thật từ
 * `GET /admin/overview`, nhưng chưa có màn riêng để mở nên vẫn để tắt: badge
 * cho HLV biết có việc cần xử lý, còn trang xử lý là việc của đợt sau.
 * "Tổng quan" và "Buổi tập" thì chưa có cả số lẫn màn.
 */
function useGroups(): { title: string; items: Item[] }[] {
  const users = useAdminUsers()
  const exercises = useExercises()
  const templates = useTemplates()
  const overview = useAdminOverview()

  return [
    {
      title: "Theo dõi",
      items: [
        { label: "Tổng quan" },
        { label: "Người dùng", to: "/admin/users", count: users.data?.length },
        { label: "Buổi tập" },
      ],
    },
    {
      title: "Chấm form",
      items: [
        { label: "Bài tập và ngưỡng", to: "/admin/exercises", count: exercises.data?.length },
        {
          label: "Hàng đợi phân tích",
          dot: "var(--color-warn)",
          count: overview.data?.reviewsInQueue,
        },
        {
          label: "Góp ý bị báo sai",
          dot: "var(--color-danger)",
          count: overview.data?.wrongFeedbackCount,
        },
      ],
    },
    {
      title: "Cấu hình",
      items: [
        { label: "Template chương trình", to: "/admin/templates", count: templates.data?.length },
      ],
    },
  ]
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { role, logout } = useAuth()
  const groups = useGroups()

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <nav className="flex w-[248px] flex-none flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] py-5.5">
        <div className="border-b border-[var(--color-border)] px-5 pb-5">
          <div className="text-lg font-extrabold tracking-tight">Sổ Tập</div>
          <div className="kicker mt-1">Bảng quản trị</div>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <div className="kicker px-3 pt-4 pb-2 text-[10px] tracking-[0.12em]">{group.title}</div>
            {group.items.map((item) => (
              <NavItem key={item.label} item={item} />
            ))}
          </div>
        ))}

        <div className="flex-1" />
        <div className="mx-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3">
          <div className="text-[13px] font-semibold">Tài khoản quản trị</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            {role === "ADMIN" ? "huấn luyện viên · toàn quyền" : role}
          </div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

/**
 * Thanh tiêu đề của vùng nội dung admin: nhóm đang xem, tên màn, rồi các nút
 * công cụ dồn về phải. Mọi màn admin dùng chung một thanh này.
 */
export function AdminHeader({
  group,
  title,
  children,
}: {
  group: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-7 py-4.5">
      <div className="min-w-0 flex-1">
        <div className="kicker">{group}</div>
        <div className="mt-0.5 truncate text-xl font-bold">{title}</div>
      </div>
      {children}
    </div>
  )
}

function NavItem({ item }: { item: Item }) {
  const dot = (color: string) => (
    <span className="size-1.5 rounded-[2px]" style={{ background: color }} />
  )
  const body = (active: boolean) => (
    <>
      {dot(active ? "var(--color-accent-fg)" : (item.dot ?? "var(--color-border)"))}
      <span className="flex-1">{item.label}</span>
      {item.count != null && <span className="num text-xs font-bold">{item.count}</span>}
    </>
  )
  const base = "mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm"

  if (!item.to) {
    return (
      <span
        aria-disabled="true"
        title="Chưa có trong bản này"
        className={cn(base, "cursor-not-allowed text-[var(--color-text-muted)] opacity-45")}
      >
        {body(false)}
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          base,
          isActive
            ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
        )
      }
    >
      {({ isActive }) => body(isActive)}
    </NavLink>
  )
}
