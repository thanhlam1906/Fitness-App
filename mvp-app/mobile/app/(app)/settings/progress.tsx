import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { barHeights } from "@/features/profile/utils/charts"
import { cn } from "@/lib/cn"
import { formatDayMonth, formatNumber } from "@/lib/format"
import { LoadState, SettingsSubPage } from "~/features/profile/SettingsSubPage"
import { useProgress } from "~/features/profile/useProfile"

const NUM = { fontVariant: ["tabular-nums" as const] }
const RANGES = [4, 8, 12] as const
const BAR_MAX_PX = 80
const RPE = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })

/**
 * Cài đặt › Tiến bộ — bản mobile của ProgressPage web. Mọi số do backend tính (ProgressService,
 * cùng phép tính trợ lý dùng), app chỉ hiển thị. Cột = khối lượng từng tuần cuộn 7 ngày, cũ trước.
 */
export default function ProgressScreen() {
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(4)
  const progress = useProgress(weeks)
  const p = progress.data
  const heights = p ? barHeights(p.weekly.map((w) => w.tonnageKg), BAR_MAX_PX) : []

  return (
    <SettingsSubPage title="Tiến bộ">
      <View accessibilityRole="radiogroup" accessibilityLabel="Khoảng thời gian" className="mt-4 flex-row gap-1.5 rounded-md bg-surface p-1">
        {RANGES.map((r) => {
          const on = weeks === r
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setWeeks(r)}
              className={cn("flex-1 items-center rounded-sm py-2", on && "bg-surface-2")}
            >
              <Text className={cn("text-[13px] font-bold", on ? "text-text" : "text-text-muted")}>{r} tuần</Text>
            </Pressable>
          )
        })}
      </View>

      {!p ? (
        <LoadState error={progress.error} />
      ) : (
        <>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Tile label="Buổi đã tập" value={formatNumber(p.sessionsStarted)} note={`hoàn thành ${p.sessionsFinished}`} />
            <Tile
              label="RPE trung bình"
              value={p.avgSessionRpe == null ? "—" : RPE.format(p.avgSessionRpe)}
              note={p.avgSessionRpe == null ? "chưa ghi RPE buổi nào" : "mỗi buổi"}
            />
            <View className="w-full rounded-md bg-surface p-3.5">
              <TileHead label="Tổng khối lượng đã nâng" value={`${formatNumber(p.totalTonnageKg)} kg`} note="kg × rep của mọi hiệp" />
              <View className="mt-3 h-[110px] flex-row items-end gap-1.5" importantForAccessibility="no-hide-descendants">
                {p.weekly.map((w, i) => (
                  <View key={w.from} className="h-full min-w-0 flex-1 items-center justify-end gap-1.5">
                    <View
                      className="w-full rounded-t-[5px] border-t-2 border-accent bg-accent-tint"
                      style={{ height: Math.max(heights[i], 2) }}
                    />
                    {/* 12 tuần: chỉ ghi nhãn cách một để chữ không đè nhau. */}
                    <Text className="text-[10px] text-text-muted" numberOfLines={1} style={NUM}>
                      {p.weekly.length > 8 && i % 2 === 1 ? " " : formatDayMonth(w.from)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <Text className="mt-3.5 text-xs leading-5 text-text-muted">
            Chỉ tính các buổi bạn đã bắt đầu trong app. Không ước lượng, không làm tròn thêm.
          </Text>
        </>
      )}
    </SettingsSubPage>
  )
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    // Hai ô một hàng như lưới 2 cột của web.
    <View className="rounded-md bg-surface p-3.5" style={{ width: "48.8%" }}>
      <TileHead label={label} value={value} note={note} />
    </View>
  )
}

function TileHead({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <>
      <Text className="text-[11px] text-text-muted">{label}</Text>
      <Text className="mt-1 text-[26px] font-extrabold leading-[32px] text-text" style={NUM}>
        {value}
      </Text>
      <Text className="text-xs text-text-muted">{note}</Text>
    </>
  )
}
