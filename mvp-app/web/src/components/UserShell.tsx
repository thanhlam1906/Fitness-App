import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router"
import { cn } from "@/lib/cn"

/**
 * Bản user là màn điện thoại (design dựng trong khung 402×874), nên nội dung
 * chạy một cột hẹp căn giữa kể cả trên màn hình rộng.
 */
const TABS = [
  { to: "/schedule", label: "Lịch tuần" },
  { to: "/form-check", label: "Kiểm tra form" },
  { to: "/settings", label: "Hồ sơ" },
]

export function UserShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // Các luồng (onboarding, buổi tập, gửi clip) có nút hành động riêng ở đáy màn —
  // design không vẽ thanh tab ở đó và chồng hai thứ lên nhau thì bấm nhầm.
  const showTabs = TABS.some((tab) => tab.to === pathname)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className={cn("mx-auto w-full max-w-[430px] px-5 pt-8", showTabs ? "pb-28" : "pb-11")}>
        {children}
      </div>
      {showTabs && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-[430px]">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "flex-1 py-3.5 text-center text-xs font-semibold",
                    isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

/**
 * Màn luồng (onboarding, chọn chương trình, gửi clip, kết buổi): design đẩy
 * nút hành động xuống đáy khung. 76px là pt-8 + pb-11 của cột trên.
 */
export function FlowScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[calc(100dvh-76px)] flex-col">{children}</div>
}
