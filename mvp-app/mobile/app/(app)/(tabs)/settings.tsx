import type { ComponentType, ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter, type Href } from "expo-router"
import { ChevronRight, Info, ListChecks, Scale, ShieldCheck, TrendingUp, User } from "lucide-react-native"
import { GOALS, labelOf } from "@/features/profile/types"
import { cn } from "@/lib/cn"
import { formatKg } from "@/lib/format"
import { useAuth } from "~/auth/AuthContext"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { useCurrentProgram } from "~/features/program/useCurrentProgram"
import { useBodyMetrics, useProfile, useProgress } from "~/features/profile/useProfile"
import { useRefreshOnFocus } from "~/lib/focus"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Tab Cài đặt (doc/design-cai-dat-v1.md, mockup doc/mockup-settings/demo.html) — bản mobile của
 * SettingsPage web: thẻ tóm tắt rồi các dòng mở màn con. Đăng xuất thì guard tự đưa về màn đăng nhập.
 */
export default function SettingsScreen() {
  const { logout } = useAuth()
  const profile = useProfile()
  const program = useCurrentProgram()
  const progress = useProgress(4)
  const metrics = useBodyMetrics()
  // Tóm tắt tiến bộ, cân nặng đổi sau buổi tập hay ở màn con: tab không dựng lại nên tự tải lại.
  useRefreshOnFocus(() => {
    profile.refetch()
    program.refetch()
    progress.refetch()
    metrics.refetch()
  })

  const data = profile.data
  const weight = data?.latestBodyMetric?.weightKg
  const weighIns = metrics.data?.filter((m) => m.weightKg != null).length

  return (
    <Screen>
      <Kicker>Tài khoản</Kicker>
      <Text className="mt-2 text-[28px] font-extrabold leading-[34px] tracking-[-0.5px] text-text">Cài đặt</Text>

      <View className="mt-4 flex-row items-center gap-3 rounded-md border border-border bg-surface p-3.5">
        <View className="size-[46px] items-center justify-center rounded-full bg-accent-tint">
          <Text className="text-lg font-extrabold text-accent">{data?.fullName?.trim().charAt(0).toUpperCase() || "?"}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-text" numberOfLines={1}>
            {data?.fullName || "Tài khoản của bạn"}
          </Text>
          <Text className="mt-0.5 text-xs text-text-muted" numberOfLines={1} style={NUM}>
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
                : "Đang tải…"}
          </Text>
        </View>
      </View>

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
                ? "Đang tải…"
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
        <Row to="/settings/privacy" Icon={ShieldCheck} title="Dữ liệu & quyền riêng tư" sub="Camera, clip, trợ lý" />
        <Row to="/settings/about" Icon={Info} title="Giới thiệu & điều khoản" sub="Cam kết an toàn" />
      </Group>

      <Pressable
        accessibilityRole="button"
        onPress={logout}
        className="mt-6 h-12 w-full items-center justify-center rounded-md border border-border active:bg-surface"
      >
        <Text className="text-[15px] font-bold text-danger">Đăng xuất</Text>
      </Pressable>
      <Text className="mt-3 text-center text-[11px] text-text-muted">VFit · bản thử nghiệm</Text>
    </Screen>
  )
}

const WEEKDAY_LABEL = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"]

/** "nghỉ T3, T5"; không nghỉ ngày nào thì bỏ hẳn. */
function restDaysLabel(restDays: number[]): string {
  return restDays.length === 0 ? "" : `nghỉ ${restDays.map((d) => WEEKDAY_LABEL[d] ?? d).join(", ")}`
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <Kicker>{title}</Kicker>
      <View className="mt-2 overflow-hidden rounded-md border border-border bg-surface">{children}</View>
    </View>
  )
}

function Row({
  to,
  Icon,
  title,
  sub,
  accent = false,
}: {
  to: Href
  Icon: ComponentType<{ color: string; size?: number }>
  title: string
  sub: string
  accent?: boolean
}) {
  const router = useRouter()
  return (
    // Đường kẻ giữa các dòng: viền trên cho mọi dòng, dòng đầu bị khung bo che (divide-y của web).
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(to)}
      className="-mt-px flex-row items-center gap-3 border-t border-border px-3.5 py-3 active:bg-surface-2"
    >
      <View className={cn("size-[34px] items-center justify-center rounded-[10px]", accent ? "bg-accent-tint" : "bg-surface-2")}>
        <Icon size={18} color={accent ? colors.accent : colors.text} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-text">{title}</Text>
        <Text className="text-xs text-text-muted" numberOfLines={1} style={NUM}>
          {sub}
        </Text>
      </View>
      <ChevronRight size={16} color={colors["text-muted"]} />
    </Pressable>
  )
}
