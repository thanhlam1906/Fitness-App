import { useState, type ReactNode } from "react"
import { ChartLine } from "lucide-react"
import { IconText } from "@/components/StatusViews"
import { lineCoords } from "@/features/admin/utils/dashboard"

const W = 1000
const H = 160
const PAD = 8

/**
 * Biểu đồ đường một dãy số, tô nhạt vùng dưới đường. Rê chuột: vạch dọc + chấm ở điểm gần nhất và hộp số
 * do `tip` dựng. Vẽ tay bằng SVG như DonutChart để không thêm thư viện. SVG giãn ngang theo thẻ
 * (preserveAspectRatio none), nét giữ độ dày nhờ non-scaling-stroke.
 */
export function LineChart({
  values,
  labels,
  color,
  ariaLabel,
  tip,
  emptyText,
}: {
  values: number[]
  labels: { short: string; long: string }[]
  color: string
  ariaLabel: string
  tip: (i: number) => ReactNode
  emptyText: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  if (!values.some((v) => v > 0)) {
    return (
      <IconText icon={ChartLine} tone="muted" className="justify-center py-6 text-xs">
        {emptyText}
      </IconText>
    )
  }

  const n = values.length
  const pts = lineCoords(values, W, H, PAD)
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ")
  // Đổi khoảng ngày khi chuột còn trên biểu đồ: số điểm giảm mà hover cũ còn, bỏ chỉ số ngoài dãy.
  const h = hover !== null && hover < n ? hover : null
  const at = h === null ? null : { ...pts[h], left: (pts[h].x / W) * 100 }

  return (
    <div>
      <div
        className="relative"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
        }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
          className="block h-40 w-full border-b border-[var(--color-border)]"
        >
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1="0"
              x2={W}
              y1={PAD + t * (H - 2 * PAD)}
              y2={PAD + t * (H - 2 * PAD)}
              stroke="var(--color-border)"
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polygon points={`0,${H} ${line} ${W},${H}`} fill={`color-mix(in srgb, ${color} 16%, transparent)`} />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {at && (
            <line
              x1={at.x}
              x2={at.x}
              y1="0"
              y2={H}
              stroke="var(--color-text-muted)"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {at && h !== null && (
          <>
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-bg)]"
              style={{ left: `${at.left}%`, top: `${(at.y / H) * 100}%`, background: color }}
            />
            {/* Nửa phải thì hộp số lật sang trái vạch để không tràn khỏi thẻ. */}
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs leading-relaxed shadow-lg"
              style={at.left > 50 ? { right: `calc(${100 - at.left}% + 12px)` } : { left: `calc(${at.left}% + 12px)` }}
            >
              <div className="font-bold">{labels[h].long}</div>
              {tip(h)}
            </div>
          </>
        )}
      </div>
      <div className="num mt-1.5 flex justify-between text-[11px] text-[var(--color-text-muted)]">
        <span>{labels[0].short}</span>
        <span>{labels[Math.floor(n / 2)].short}</span>
        <span>{labels[n - 1].short}</span>
      </div>
    </div>
  )
}
