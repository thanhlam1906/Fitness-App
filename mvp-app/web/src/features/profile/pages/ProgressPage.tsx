import { useState } from "react"
import { SHEET_FOCUS } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { formatDayMonth, formatNumber } from "@/lib/format"
import { barHeights } from "@/features/profile/utils/charts"
import { LoadState, SettingsSubLayout } from "@/features/profile/components/SettingsSubLayout"
import { useProgress } from "@/features/profile/api/useProfile"

const RANGES = [4, 8, 12] as const
const BAR_MAX_PX = 80
const RPE = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })

/**
 * Cài đặt › Tiến bộ. Mọi số do backend tính từ các buổi đã ghi (ProgressService — cùng phép
 * tính trợ lý dùng), web chỉ hiển thị. Cột = khối lượng từng tuần cuộn 7 ngày, cũ trước.
 */
export function ProgressPage() {
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(4)
  const progress = useProgress(weeks)
  const p = progress.data
  const heights = p ? barHeights(p.weekly.map((w) => w.tonnageKg), BAR_MAX_PX) : []

  return (
    <SettingsSubLayout title="Tiến bộ">
      <div role="radiogroup" aria-label="Khoảng thời gian" className="mt-4 flex gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={weeks === r}
            onClick={() => setWeeks(r)}
            className={cn(
              "flex-1 rounded-[var(--radius-sm)] py-2 text-[13px] font-bold",
              weeks === r ? "bg-[var(--color-surface-2)] text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
              SHEET_FOCUS,
            )}
          >
            {r} tuần
          </button>
        ))}
      </div>

      {!p ? (
        <LoadState
          error={progress.error}
          skeleton={
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-[102px]" />
              <Skeleton className="h-[102px]" />
              <Skeleton className="col-span-2 h-[222px]" />
            </div>
          }
        />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Tile label="Buổi đã tập" value={formatNumber(p.sessionsStarted)} note={`hoàn thành ${p.sessionsFinished}`} />
            <Tile
              label="RPE trung bình"
              value={p.avgSessionRpe == null ? "—" : RPE.format(p.avgSessionRpe)}
              note={p.avgSessionRpe == null ? "chưa ghi RPE buổi nào" : "mỗi buổi"}
            />
            <div className="col-span-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
              <TileHead label="Tổng khối lượng đã nâng" value={`${formatNumber(p.totalTonnageKg)} kg`} note="kg × rep của mọi hiệp" />
              <div className="mt-3 flex h-[110px] items-end gap-1.5" aria-hidden>
                {p.weekly.map((w, i) => (
                  <div key={w.from} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span
                      className="w-full rounded-t-[5px] border-t-2 border-[var(--color-accent)] bg-[var(--color-accent-tint)]"
                      style={{ height: Math.max(heights[i], 2) }}
                    />
                    {/* 12 tuần: chỉ ghi nhãn cách một để chữ không đè nhau. */}
                    <em className="num text-[10px] whitespace-nowrap text-[var(--color-text-muted)] not-italic">
                      {p.weekly.length > 8 && i % 2 === 1 ? " " : formatDayMonth(w.from)}
                    </em>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Chỉ tính các buổi bạn đã bắt đầu trong app. Không ước lượng, không làm tròn thêm.
          </p>
        </>
      )}
    </SettingsSubLayout>
  )
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
      <TileHead label={label} value={value} note={note} />
    </div>
  )
}

function TileHead({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <>
      <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
      <div className="num mt-1 text-[26px] leading-tight font-extrabold">{value}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{note}</div>
    </>
  )
}
