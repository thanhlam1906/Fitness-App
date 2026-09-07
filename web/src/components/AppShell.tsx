import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { useCurrentUser } from "@/auth/CurrentUserContext"
import { cn } from "@/lib/cn"

const NAV_LINKS = [
  { to: "/onboarding", label: "Onboarding" },
  { to: "/program", label: "Chọn chương trình" },
  { to: "/admin/exercises", label: "Admin · Bài tập" },
  { to: "/admin/templates", label: "Admin · Template" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { userId, setUserId } = useCurrentUser()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
        <nav className="flex items-center gap-4">
          <span className="text-lg font-semibold">Fitness</span>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                  isActive && "text-[var(--color-text)] font-medium",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {userId && (
          <button
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setUserId(null)}
          >
            {userId.slice(0, 8)}… · đổi user
          </button>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  )
}
