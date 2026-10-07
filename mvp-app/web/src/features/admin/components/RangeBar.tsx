import { cn } from "@/lib/cn"
import { zones, type Range } from "@/lib/formMeasures"

/** Thanh xanh (đạt) / vàng (sát ngưỡng) / đỏ (không đạt) trên thang 0..max của số đo. */
export function RangeBar({ range, max, mini = false }: { range: Range; max: number; mini?: boolean }) {
  const z = zones(range, max)
  const pct = (v: number) => (v / max) * 100
  return (
    <div>
      <div className={cn("relative overflow-hidden rounded-full bg-[var(--color-danger)]", mini ? "h-2" : "h-3")}>
        {z.warn.map(([a, b]) => (
          <div
            key={a}
            className="absolute inset-y-0 bg-[var(--color-warn)]"
            style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }}
          />
        ))}
        <div
          className="absolute inset-y-0 bg-[var(--color-success)]"
          style={{ left: `${pct(z.pass[0])}%`, width: `${pct(z.pass[1]) - pct(z.pass[0])}%` }}
        />
      </div>
      {!mini && (
        <>
          <div className="num relative mt-1 h-4 text-[11px] text-[var(--color-text-muted)]">
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
              <span
                key={f}
                className={cn("absolute", i === 0 ? "" : i === 4 ? "-translate-x-full" : "-translate-x-1/2")}
                style={{ left: `${f * 100}%` }}
              >
                {Math.round(max * f)}°
              </span>
            ))}
          </div>
          <div className="mt-0.5 flex gap-3.5 text-xs text-[var(--color-text-muted)]">
            <Legend color="var(--color-success)">Đạt</Legend>
            <Legend color="var(--color-warn)">Sát ngưỡng</Legend>
            <Legend color="var(--color-danger)">Không đạt</Legend>
          </div>
        </>
      )}
    </div>
  )
}

function Legend({ color, children }: { color: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className="inline-block size-2.5 rounded-[3px]" style={{ background: color }} />
      {children}
    </span>
  )
}
