import { donutArcs, type Slice } from "@/features/admin/utils/workoutInsights"

const R = 52
const C = 2 * Math.PI * R

/**
 * Vòng tròn chia phần, số tổng ở giữa, chú thích số + % bên dưới. Rê chuột lên phần hay dòng chú thích
 * hiện chi tiết (thẻ title). Vẽ tay bằng SVG để không thêm thư viện biểu đồ.
 */
export function DonutChart({ slices, center, centerLabel }: { slices: Slice[]; center: string; centerLabel: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const arcs = donutArcs(
    slices.map((s) => s.value),
    C,
  )
  const pct = (v: number) => (total === 0 ? 0 : Math.round((v * 100) / total))
  const describe = (s: Slice) => `${s.label}: ${s.value} (${pct(s.value)}%)${s.detail ? ` · ${s.detail}` : ""}`

  return (
    <div className="flex flex-col gap-3.5">
      <svg viewBox="0 0 132 132" className="size-[140px] self-center" role="img" aria-label={`${center} ${centerLabel}`}>
        <circle cx="66" cy="66" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth="16" />
        {slices.map((s, i) =>
          arcs[i].length > 0 ? (
            <circle
              key={s.key}
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${arcs[i].length} ${C}`}
              strokeDashoffset={-arcs[i].offset}
              transform="rotate(-90 66 66)"
              className="transition-opacity hover:opacity-80"
            >
              <title>{describe(s)}</title>
            </circle>
          ) : null,
        )}
        <text x="66" y="66" textAnchor="middle" className="num fill-[var(--color-text)] text-[22px] font-bold">
          {center}
        </text>
        <text x="66" y="82" textAnchor="middle" className="fill-[var(--color-text-muted)] text-[10px]">
          {centerLabel}
        </text>
      </svg>
      {slices.length === 0 ? (
        <p className="text-center text-xs text-[var(--color-text-muted)]">Chưa có dữ liệu trong khoảng này.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {slices.map((s) => (
            <li
              key={s.key}
              title={describe(s)}
              className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-[12.5px]"
            >
              <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
              <span className="truncate">{s.label}</span>
              <span className="num font-bold">
                {s.value}
                <span className="ml-1 font-normal text-[var(--color-text-muted)]">{pct(s.value)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
