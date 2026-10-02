import { useState } from "react"
import { Text, View } from "react-native"
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg"
import { weightSeries } from "@/features/profile/charts"
import { WEIGHT_KG } from "@/features/profile/types"
import { cn } from "@/lib/cn"
import { formatDate, formatDayMonth, formatKg } from "@/lib/format"
import { Button } from "~/components/ui/Button"
import { MetricEditor } from "~/features/profile/MetricEditor"
import { LoadState, SettingsSubPage } from "~/features/profile/SettingsSubPage"
import { useBodyMetrics, useSaveBodyMetric } from "~/features/profile/useProfile"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }
const W = 350
const H = 130
const PAD = 14
const KG = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })

/** "+1,5" / "-0,8" / "0" — tự ghép dấu, không dựa vào signDisplay của Intl (Hermes chưa chắc có). */
function signedKg(delta: number): string {
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${KG.format(Math.abs(delta))}`
}

/**
 * Cài đặt › Lịch sử cân nặng — bản mobile của WeightHistoryPage web. Điểm và mức chênh do code tính
 * (charts.ts), vẽ bằng react-native-svg. Mức chênh để màu trung tính: tăng hay giảm là tốt tuỳ mục
 * tiêu (tăng cơ khác giảm mỡ), app không phán.
 */
export default function WeightHistoryScreen() {
  const metrics = useBodyMetrics()
  const save = useSaveBodyMetric()
  const [editing, setEditing] = useState(false)

  if (!metrics.data) {
    return (
      <SettingsSubPage title="Lịch sử cân nặng">
        <LoadState error={metrics.error} />
      </SettingsSubPage>
    )
  }

  const weighIns = metrics.data.filter((m) => m.weightKg != null)
  const series = weightSeries(metrics.data, W, H, PAD)
  const latest = weighIns[0]

  return (
    <SettingsSubPage title="Lịch sử cân nặng">
      {latest ? (
        <>
          <View className="mt-4 flex-row items-baseline gap-2.5">
            <Text className="text-[40px] font-extrabold leading-[44px] text-text" style={NUM}>
              {KG.format(latest.weightKg!)}
            </Text>
            <Text className="text-sm text-text-muted">kg · {formatDayMonth(latest.measuredOn)}</Text>
          </View>
          {series.delta != null && (
            <View className="mt-2 self-start rounded-full bg-surface-2 px-2.5 py-0.5">
              <Text className="text-xs font-bold text-text" style={NUM}>
                {signedKg(series.delta)} kg từ {formatDayMonth(series.points[0].measuredOn)}
              </Text>
            </View>
          )}

          {series.points.length > 1 && (
            <View
              className="mt-3.5 rounded-md bg-surface px-2.5 pb-2 pt-3"
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Cân nặng ${series.points.length} lần gần nhất`}
            >
              <Svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" style={{ aspectRatio: W / (H + 18) }}>
                <Path d={series.path} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
                {series.points.map((pt, i) => {
                  const last = i === series.points.length - 1
                  return (
                    <G key={pt.measuredOn}>
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={last ? 4.5 : 3}
                        fill={last ? colors.accent : colors.surface}
                        stroke={colors.accent}
                        strokeWidth={2}
                      />
                      {/* Nhãn đầu/cuối canh theo mép, không canh giữa — canh giữa thì tràn khỏi khung. */}
                      <SvgText
                        x={pt.x}
                        y={H + 12}
                        fill={colors["text-muted"]}
                        fontSize={10}
                        textAnchor={i === 0 ? "start" : last ? "end" : "middle"}
                      >
                        {/* Nhiều điểm thì chỉ ghi nhãn điểm đầu, cuối và cách một. */}
                        {series.points.length <= 7 || last || i % 2 === 0 ? formatDayMonth(pt.measuredOn) : ""}
                      </SvgText>
                    </G>
                  )
                })}
              </Svg>
            </View>
          )}

          <View className="mt-3.5">
            {weighIns.map((m, i) => (
              <View key={m.measuredOn} className={cn("flex-row justify-between py-2.5", i > 0 && "border-t border-border")}>
                <Text className="text-sm text-text-muted" style={NUM}>
                  {formatDate(m.measuredOn)}
                </Text>
                <Text className="text-sm font-bold text-text" style={NUM}>
                  {formatKg(m.weightKg)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text className="mt-5 text-sm text-text-muted">Chưa có lần đo nào. Cập nhật cân nặng để bắt đầu theo dõi.</Text>
      )}

      <View className="mt-4">
        {editing ? (
          <MetricEditor
            unit="kg"
            decimal
            {...WEIGHT_KG}
            initial={latest?.weightKg}
            pending={save.isPending}
            onSave={(weightKg) => save.mutate({ weightKg }, { onSuccess: () => setEditing(false) })}
          />
        ) : (
          <Button className="w-full" onPress={() => setEditing(true)}>
            Cập nhật cân nặng hôm nay
          </Button>
        )}
        {save.isError && <Text className="mt-2 text-sm text-danger">Lưu thất bại: {save.error.message}</Text>}
      </View>
    </SettingsSubPage>
  )
}
