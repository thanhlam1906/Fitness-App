import { useState, type ReactNode } from "react"
import { useCurrentUser } from "./CurrentUserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Đứng chỗ RequireAuth.tsx thật cho tới khi có đăng nhập — xem CurrentUserContext.tsx. */
export function RequireUser({ children }: { children: ReactNode }) {
  const { userId, setUserId } = useCurrentUser()
  const [draft, setDraft] = useState("")

  if (userId) return <>{children}</>

  return (
    <div className="mx-auto mt-24 max-w-sm space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div>
        <h1 className="text-lg font-semibold">Chưa có đăng nhập</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Backend chưa cấp JWT. Dán user id (UUID) đã tạo sẵn trong bảng{" "}
          <code>users</code> để test.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="userId">User ID</Label>
        <Input
          id="userId"
          placeholder="00000000-0000-0000-0000-000000000000"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        disabled={!draft.trim()}
        onClick={() => setUserId(draft.trim())}
      >
        Dùng user này
      </Button>
    </div>
  )
}
