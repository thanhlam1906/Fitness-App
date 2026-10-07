import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDate, formatDayMonth, formatKg } from "@/lib/format"
import { weightSeries } from "@/features/profile/utils/charts"
import { MetricEditor } from "./ProfilePage"
import { LoadState, SettingsSubLayout } from "@/features/profile/components/SettingsSubLayout"
import { WEIGHT_KG } from "@/features/profile/types"
import { useBodyMetrics, useSaveBodyMetric } from "@/features/profile/api/useProfile"

const W = 350
const H = 130
const PAD = 14
const KG = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })
const DELTA = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1, signDisplay: "exceptZero" })

/**
 * Cài đặt › Lịch sử cân nặng. Điểm và mức chênh do code tính (charts.ts), vẽ SVG tay — repo
 * không thêm thư viện biểu đồ. Mức chênh để màu trung tính: tăng hay giảm là tốt tuỳ mục tiêu
 * (tăng cơ khác giảm mỡ), app không phán.
 */
export function WeightHistoryPage() {
  const metrics = useBodyMetrics()
  const save = useSaveBodyMetric()
  const [editing, setEditing] = useState(false)

  if (!metrics.data) {
    return (
      <SettingsSubLayout title="Lịch sử cân nặng">
        <LoadState error={metrics.error} />
      </SettingsSubLayout>
    )
  }

  const weighIns = metrics.data.filter((m) => m.weightKg != null)
  const series = weightSeries(metrics.data, W, H, PAD)
  const latest = weighIns[0]

  return (
    <SettingsSubLayout title="Lịch sử cân nặng">
      {latest ? (
        <>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="num text-[40px] leading-none font-extrabold">{KG.format(latest.weightKg!)}</span>
            <span className="text-sm text-[var(--color-text-muted)]">kg · {formatDayMonth(latest.measuredOn)}</span>
          </div>
          {series.delta != null && (
            <span className="num mt-2 inline-block rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 text-xs font-bold">
              {DELTA.format(series.delta)} kg từ {formatDayMonth(series.points[0].measuredOn)}
            </span>
          )}

          {series.points.length > 1 && (
            <div className="mt-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-2.5 pt-3 pb-2">
              <svg
                viewBox={`0 0 ${W} ${H + 18}`}
                className="w-full"
                role="img"
                aria-label={`Cân nặng ${series.points.length} lần gần nhất`}
              >
                <path d={series.path} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" />
                {series.points.map((pt, i) => {
                  const last = i === series.points.length - 1
                  return (
                    <g key={pt.measuredOn}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={last ? 4.5 : 3}
                        fill={last ? "var(--color-accent)" : "var(--color-surface)"}
                        stroke="var(--color-accent)"
                        strokeWidth={2}
                      />
                      {/* Nhãn đầu/cuối canh theo mép, không canh giữa — canh giữa thì tràn khỏi khung. */}
                      <text
                        x={pt.x}
                        y={H + 12}
                        fill="var(--color-text-muted)"
                        fontSize={10}
                        textAnchor={i === 0 ? "start" : last ? "end" : "middle"}
                      >
                        {/* Nhiều điểm thì chỉ ghi nhãn điểm đầu, cuối và cách một. */}
                        {series.points.length <= 7 || last || i % 2 === 0 ? formatDayMonth(pt.measuredOn) : ""}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}

          <ul className="mt-3.5">
            {weighIns.map((m) => (
              <li
                key={m.measuredOn}
                className="num flex justify-between border-t border-[var(--color-border)] py-2.5 text-sm first:border-t-0"
              >
                <span className="text-[var(--color-text-muted)]">{formatDate(m.measuredOn)}</span>
                <b>{formatKg(m.weightKg)}</b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">Chưa có lần đo nào. Cập nhật cân nặng để bắt đầu theo dõi.</p>
      )}

      <div className="mt-4">
        {editing ? (
          <MetricEditor
            unit="kg"
            step="0.1"
            {...WEIGHT_KG}
            initial={latest?.weightKg}
            pending={save.isPending}
            onSave={(weightKg) => save.mutate({ weightKg }, { onSuccess: () => setEditing(false) })}
          />
        ) : (
          <Button className="w-full" onClick={() => setEditing(true)}>
            Cập nhật cân nặng hôm nay
          </Button>
        )}
        {save.isError && <p className="mt-2 text-sm text-[var(--color-danger)]">Lưu thất bại: {save.error.message}</p>}
      </div>
    </SettingsSubLayout>
  )
}
