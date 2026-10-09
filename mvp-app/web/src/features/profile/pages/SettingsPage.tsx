import type { ComponentType, ReactNode } from "react"
import { ChevronRight, Info, KeyRound, ListChecks, Scale, ShieldCheck, TrendingUp, User } from "lucide-react"
import { Link } from "react-router"
import { useAuth } from "@/features/auth/components/AuthContext"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"
import { useCurrentProgram } from "@/features/program/api/useCurrentProgram"
import { GOALS, labelOf } from "@/features/profile/types"
import { useBodyMetrics, useProfile, useProgress } from "@/features/profile/api/useProfile"

/**
 * Tab Cài đặt (doc/design-cai-dat-v1.md, mockup doc/mockup-settings/demo.html): thẻ tóm tắt rồi
 * các dòng mở màn con. Thay màn Hồ sơ cũ — phần sửa hồ sơ giờ ở /settings/profile.
 */
export function SettingsPage() {
  const { logout } = useAuth()
  const profile = useProfile()
  const program = useCurrentProgram()
  const progress = useProgress(4)
  const metrics = useBodyMetrics()

  const data = profile.data
  const weight = data?.latestBodyMetric?.weightKg
  const weighIns = metrics.data?.filter((m) => m.weightKg != null).length

  return (
    <div>
      <div className="kicker">Tài khoản</div>
      <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Cài đặt</h1>

      <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
        <span
          aria-hidden
          className="grid size-[46px] flex-none place-items-center rounded-full bg-[var(--color-accent-tint)] text-lg font-extrabold text-[var(--color-accent)]"
        >
          {data?.fullName?.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{data?.fullName || "Tài khoản của bạn"}</p>
          <p className="num mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            {data
              ? [
                  data.goal && labelOf(GOALS, data.goal),
                  data.sessionsPerWeek != null && `${data.sessionsPerWeek} buổi/tuần`,
                  weight != null && formatKg(weight),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Chưa khai hồ sơ"
              : profile.isError
                ? "Không tải được hồ sơ"
                : <span role="status" aria-label="Đang tải" className="block"><Skeleton className="mt-1 h-3 w-40" /></span>}
          </p>
        </div>
      </div>

      <Group title="Tập luyện">
        <Row to="/settings/profile" Icon={User} accent title="Hồ sơ" sub="Cân nặng, mục tiêu, thiết bị…" />
        <Row
          to={program.data ? "/my-program" : "/program"}
          Icon={ListChecks}
          title="Chương trình"
          sub={
            program.data
              ? [program.data.templateName, restDaysLabel(program.data.restDays)].filter(Boolean).join(" · ")
              : program.isLoading
                ? <span role="status" aria-label="Đang tải" className="block"><Skeleton className="mt-1 h-3 w-32" /></span>
                : "Chưa có chương trình"
          }
        />
        <Row
          to="/settings/progress"
          Icon={TrendingUp}
          title="Tiến bộ"
          sub={progress.data ? `4 tuần qua: ${progress.data.sessionsStarted} buổi` : "Buổi tập, khối lượng, RPE"}
        />
        <Row
          to="/settings/weight"
          Icon={Scale}
          title="Lịch sử cân nặng"
          sub={weighIns == null ? "Các lần bạn cập nhật" : weighIns === 0 ? "Chưa có lần đo nào" : `${weighIns} lần cập nhật`}
        />
      </Group>

      <Group title="Khác">
        <Row to="/settings/password" Icon={KeyRound} title="Đổi mật khẩu" sub="Đăng xuất các thiết bị khác" />
        <Row to="/settings/privacy" Icon={ShieldCheck} title="Dữ liệu & quyền riêng tư" sub="Camera, clip, trợ lý" />
        <Row to="/settings/about" Icon={Info} title="Giới thiệu & điều khoản" sub="Cam kết an toàn" />
      </Group>

      <button
        type="button"
        onClick={logout}
        className={cn(
          "mt-6 h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] text-[15px] font-bold text-[var(--color-danger)] hover:bg-[var(--color-surface)]",
          SHEET_FOCUS,
        )}
      >
        Đăng xuất
      </button>
      <p className="mt-3 text-center text-[11px] text-[var(--color-text-muted)]">VFit · bản thử nghiệm</p>
    </div>
  )
}

const WEEKDAY_LABEL = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"]

/** "nghỉ T3, T5" như màn Hồ sơ cũ; không nghỉ ngày nào thì bỏ hẳn. */
function restDaysLabel(restDays: number[]): string {
  return restDays.length === 0 ? "" : `nghỉ ${restDays.map((d) => WEEKDAY_LABEL[d] ?? d).join(", ")}`
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="kicker">{title}</h2>
      <div className="mt-2 divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {children}
      </div>
    </section>
  )
}

function Row({
  to,
  Icon,
  title,
  sub,
  accent = false,
}: {
  to: string
  Icon: ComponentType<{ className?: string }>
  title: string
  sub: ReactNode
  accent?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3.5 py-3 hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-[34px] flex-none place-items-center rounded-[10px]",
          accent ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]" : "bg-[var(--color-surface-2)]",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="num block truncate text-xs text-[var(--color-text-muted)]">{sub}</span>
      </span>
      <ChevronRight className="size-4 flex-none text-[var(--color-text-muted)]" aria-hidden />
    </Link>
  )
}
