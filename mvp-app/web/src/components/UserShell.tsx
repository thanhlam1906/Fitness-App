import type { ReactNode } from "react"
import { CalendarDays, Camera, ListChecks, User } from "lucide-react"
import { NavLink, useLocation } from "react-router"
import { cn } from "@/lib/cn"

/**
 * Bản user là màn điện thoại (design dựng trong khung 402×874), nên nội dung
 * chạy một cột hẹp căn giữa kể cả trên màn hình rộng.
 */
// Nhãn tối đa 2 chữ để 4 tab vừa một hàng trên khung 402px; icon gánh phần
// nhận diện, chữ chỉ để khỏi phải đoán icon.
const TABS = [
  { to: "/schedule", label: "Lịch tuần", Icon: CalendarDays },
  { to: "/my-schedule", label: "Lịch riêng", Icon: ListChecks },
  { to: "/form-check", label: "Kiểm tra", Icon: Camera },
  { to: "/settings", label: "Hồ sơ", Icon: User },
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
                    "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                    isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
                  )
                }
              >
                <tab.Icon className="size-5" aria-hidden />
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
