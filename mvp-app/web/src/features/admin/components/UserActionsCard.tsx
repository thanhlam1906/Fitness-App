import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  useChangeUserRole,
  useDeleteUser,
  useResetUserPassword,
  useSetUserStatus,
} from "@/features/admin/api/useAdminUsers"
import { ConfirmDialog } from "@/features/admin/components/ConfirmDialog"
import { TemporaryPasswordDialog } from "@/features/admin/components/TemporaryPasswordDialog"
import type { AdminUserRow } from "@/features/admin/types"
import { ROLE_LABEL } from "@/features/admin/utils/userLabels"

type Action = "status" | "role" | "reset" | "delete"

/**
 * Thẻ "Quản lý tài khoản" ở hồ sơ (doc/design-quan-ly-user-v1.md §6.5). Tài khoản của chính mình:
 * nút mờ — server cũng từ chối, đây chỉ để admin khỏi bấm rồi mới biết.
 */
export function UserActionsCard({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<Action | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const setStatus = useSetUserStatus(user.id)
  const changeRole = useChangeUserRole(user.id)
  const reset = useResetUserPassword(user.id)
  const remove = useDeleteUser(user.id)
  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN"

  const close = () => {
    setOpen(null)
    for (const m of [setStatus, changeRole, reset, remove]) m.reset()
  }

  return (
    <Card>
      <p className="text-sm font-semibold">Quản lý tài khoản</p>
      {isSelf && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Không thao tác trên tài khoản của chính bạn.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={isSelf} onClick={() => setOpen("status")}>
          {user.active ? "Khoá tài khoản" : "Mở khoá"}
        </Button>
        <Button size="sm" variant="secondary" disabled={isSelf} onClick={() => setOpen("role")}>
          {nextRole === "ADMIN" ? "Nâng lên quản trị" : "Hạ xuống người tập"}
        </Button>
        <Button size="sm" variant="secondary" disabled={isSelf} onClick={() => setOpen("reset")}>
          Đặt lại mật khẩu
        </Button>
        <Button size="sm" variant="secondary" disabled={isSelf} onClick={() => setOpen("delete")}>
          Xoá tài khoản
        </Button>
      </div>

      {open === "status" &&
        (user.active ? (
          <ConfirmDialog
            title="Khoá tài khoản?"
            description={`${user.email} sẽ bị đăng xuất ngay ở thao tác kế tiếp và không đăng nhập được cho tới khi mở khoá.`}
            confirmLabel="Khoá"
            danger
            reasonLabel="Lý do (lưu vào nhật ký)"
            pending={setStatus.isPending}
            error={setStatus.error?.message ?? null}
            onConfirm={(reason) => setStatus.mutate({ active: false, reason }, { onSuccess: close })}
            onClose={close}
          />
        ) : (
          <ConfirmDialog
            title="Mở khoá tài khoản?"
            description={`${user.email} đăng nhập lại được.`}
            confirmLabel="Mở khoá"
            pending={setStatus.isPending}
            error={setStatus.error?.message ?? null}
            onConfirm={() => setStatus.mutate({ active: true, reason: null }, { onSuccess: close })}
            onClose={close}
          />
        ))}

      {open === "role" && (
        <ConfirmDialog
          title={`Đổi vai trò thành ${ROLE_LABEL[nextRole]}?`}
          description={`${user.email} sẽ bị đăng xuất và đăng nhập lại với vai trò mới.`}
          confirmLabel="Đổi vai trò"
          pending={changeRole.isPending}
          error={changeRole.error?.message ?? null}
          onConfirm={() => changeRole.mutate(nextRole, { onSuccess: close })}
          onClose={close}
        />
      )}

      {open === "reset" && (
        <ConfirmDialog
          title="Đặt lại mật khẩu?"
          description={`Hệ thống sinh mật khẩu tạm cho ${user.email}; mọi phiên đang đăng nhập bị đăng xuất. Lần đăng nhập đầu họ phải đặt mật khẩu mới.`}
          confirmLabel="Đặt lại"
          pending={reset.isPending}
          error={reset.error?.message ?? null}
          onConfirm={() =>
            reset.mutate(undefined, {
              onSuccess: (r) => {
                close()
                setTempPassword(r.temporaryPassword)
              },
            })
          }
          onClose={close}
        />
      )}

      {open === "delete" && (
        <ConfirmDialog
          title="Xoá tài khoản?"
          description="Xoá hẳn người dùng cùng toàn bộ lịch, buổi tập, số đo và lịch sử chấm form. Không khôi phục được. Nhật ký quản trị vẫn giữ email."
          confirmLabel="Xoá vĩnh viễn"
          danger
          reasonLabel="Lý do (lưu vào nhật ký)"
          confirmText={user.email}
          pending={remove.isPending}
          error={remove.error?.message ?? null}
          onConfirm={(reason) => remove.mutate(reason, { onSuccess: () => navigate("/admin/users", { replace: true }) })}
          onClose={close}
        />
      )}

      {tempPassword && (
        <TemporaryPasswordDialog email={user.email} password={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </Card>
  )
}
