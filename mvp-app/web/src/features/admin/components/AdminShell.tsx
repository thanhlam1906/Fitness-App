import type { ReactNode } from "react"
import { NavLink } from "react-router"
import {
  BookOpen,
  ClipboardList,
  Dumbbell,
  Flag,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/features/auth/components/AuthContext"
import { Logo } from "@/components/Logo"
import { useDocuments } from "@/features/admin/api/useCorpus"
import { useExercises } from "@/features/exercise/api/useExercises"
import { useTemplates } from "@/features/admin/api/useTemplates"
import { useAdminOverview } from "@/features/admin/api/useAdminUsers"
import { cn } from "@/lib/cn"

type Item = {
  label: string
  to?: string
  count?: number
  Icon: LucideIcon
}

/**
 * Bản admin là sản phẩm thật (§0 concept-frontend-v1.md), nên nó có khung riêng:
 * sidebar 248px chia nhóm, không dùng chung thanh nav với bản user.
 *
 * "Góp ý bị báo sai" đã có số thật từ `GET /admin/overview`, nhưng chưa có màn
 * riêng để mở nên vẫn để tắt: badge cho HLV biết có việc cần xử lý, còn trang
 * xử lý là việc của đợt sau.
 * Không có mục hàng đợi phân tích: chấm theo ngưỡng xong trong vài giây nên
 * hàng đợi gần như luôn rỗng, admin không có gì để xử lý ở đó.
 * Nhật ký quản trị: doc/design-quan-ly-user-v1.md §6.7.
 */
function useGroups(): { title: string; items: Item[] }[] {
  const exercises = useExercises()
  const templates = useTemplates()
  const overview = useAdminOverview()
  const corpus = useDocuments()

  return [
    {
      title: "Theo dõi",
      items: [
        { label: "Tổng quan", to: "/admin", Icon: LayoutDashboard },
        { label: "Người dùng", to: "/admin/users", count: overview.data?.statusCounts.ALL, Icon: Users },
        { label: "Nhật ký quản trị", to: "/admin/audit", Icon: ScrollText },
        { label: "Buổi tập", to: "/admin/sessions", Icon: Dumbbell },
      ],
    },
    {
      title: "Chấm form",
      items: [
        { label: "Bài tập và quy chuẩn", to: "/admin/exercises", count: exercises.data?.length, Icon: Gauge },
        { label: "Góp ý bị báo sai", count: overview.data?.wrongFeedbackCount, Icon: Flag },
      ],
    },
    {
      title: "Cấu hình",
      items: [
        { label: "Template chương trình", to: "/admin/templates", count: templates.data?.length, Icon: ClipboardList },
        { label: "Kho kiến thức", to: "/admin/corpus", count: corpus.data?.length, Icon: BookOpen },
      ],
    },
  ]
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const groups = useGroups()

  return (
    // Khung cao đúng một màn hình: sidebar, cột danh sách và nội dung mỗi phần
    // tự cuộn trong vùng của nó. Cao theo nội dung thì cả trang cuộn chung.
    // Thanh cuộn ẩn ở mọi vùng bên trong (người dùng yêu cầu), vẫn cuộn bằng chuột.
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] [&_*]:[scrollbar-width:none]">
      <nav className="flex w-[248px] flex-none flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] py-5.5">
        <div className="border-b border-[var(--color-border)] px-5 pb-5">
          <Logo />
          <div className="kicker mt-1">Bảng quản trị</div>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <GroupTitle>{group.title}</GroupTitle>
            {group.items.map((item) => (
              <NavItem key={item.label} item={item} />
            ))}
          </div>
        ))}

        {/* Tài khoản là một nhóm như các nhóm trên (mockup doc/mockup-sidebar-admin, phương án A). */}
        <div>
          <GroupTitle>Tài khoản</GroupTitle>
          <div className={cn(ROW, "text-[var(--color-text-muted)]")}>
            <ShieldCheck className={ICON} aria-hidden />
            <span className="flex-1">Tài khoản quản trị</span>
          </div>
          <NavItem item={{ label: "Đổi mật khẩu", to: "/admin/password", Icon: KeyRound }} />
          <button
            onClick={logout}
            className={cn(
              ROW,
              "w-[calc(100%-1rem)] cursor-pointer text-[var(--color-text-muted)] hover:bg-[var(--color-danger-tint)] hover:text-[var(--color-danger)]",
            )}
          >
            <LogOut className={ICON} aria-hidden />
            <span className="flex-1 text-left">Đăng xuất</span>
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
  title: ReactNode
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

const ROW =
  "mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const ICON = "size-4 shrink-0"

function GroupTitle({ children }: { children: ReactNode }) {
  return <div className="kicker px-3 pt-4 pb-2 text-[10px] tracking-[0.12em]">{children}</div>
}

function NavItem({ item }: { item: Item }) {
  const body = (
    <>
      <item.Icon className={ICON} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.count != null && <span className="num text-xs font-bold">{item.count}</span>}
    </>
  )

  if (!item.to) {
    return (
      <span
        aria-disabled="true"
        title="Chưa có trong bản này"
        className={cn(ROW, "cursor-not-allowed text-[var(--color-text-muted)] opacity-45")}
      >
        {body}
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      // "/admin" là tiền tố của mọi trang admin: không `end` thì Tổng quan sáng mãi.
      end={item.to === "/admin"}
      className={({ isActive }) =>
        cn(
          ROW,
          isActive
            ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
        )
      }
    >
      {body}
    </NavLink>
  )
}
