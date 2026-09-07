import type { ReactNode } from "react"
import { useAuth } from "./AuthContext"

/** /admin/program-templates và form-checks admin-only ở backend — chặn sớm ở đây cho UX rõ hơn là để API 403. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role } = useAuth()

  if (role !== "ADMIN") {
    return (
      <div className="mx-auto mt-24 max-w-sm text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Chỉ admin mới vào được trang này.</p>
      </div>
    )
  }
  return <>{children}</>
}
