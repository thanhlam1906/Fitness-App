import type { ReactNode } from "react"
import { Text } from "react-native"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"

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

/** Dòng trạng thái tải/lỗi dùng chung cho các màn con. */
export function LoadState({ error }: { error?: Error | null }) {
  return error ? (
    <Text className="mt-5 text-sm text-danger">{error.message}</Text>
  ) : (
    <Text className="mt-5 text-sm text-text-muted">Đang tải…</Text>
  )
}
