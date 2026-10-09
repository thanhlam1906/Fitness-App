import type { ReactNode } from "react"
import { Text, View } from "react-native"
import { CloudOff } from "lucide-react-native"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"
import { StatusBlock } from "~/components/StatusViews"

/** Khung chung của các màn con trong Cài đặt: nút "‹ Cài đặt" và tiêu đề — như web. */
export function SettingsSubLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen>
      <BackLink label="Cài đặt" fallback="/settings" />
      <Text className="mt-3 text-[28px] font-extrabold leading-[34px] tracking-[-0.5px] text-text">{title}</Text>
      {children}
    </Screen>
  )
}

/** Trạng thái tải/lỗi dùng chung cho các màn con; `skeleton` là khung của chính màn đó. */
export function LoadState({ error, skeleton }: { error?: Error | null; skeleton: ReactNode }) {
  return error ? (
    <StatusBlock icon={CloudOff} tone="danger" title="Không tải được dữ liệu" detail={error.message} className="mt-5" />
  ) : (
    <View accessible accessibilityLabel="Đang tải">
      {skeleton}
    </View>
  )
}
