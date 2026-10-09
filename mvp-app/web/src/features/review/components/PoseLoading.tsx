import { cn } from "@/lib/cn"

// Khớp chính của bộ nhận dạng tư thế trên hình người 120×230, xếp từ đầu xuống chân: tiến độ sáng theo thứ tự này.
const JOINTS: [string, number, number][] = [
  ["head", 60, 22],
  ["ls", 38, 52],
  ["rs", 82, 52],
  ["le", 30, 88],
  ["re", 90, 88],
  ["lw", 26, 122],
  ["rw", 94, 122],
  ["lh", 46, 126],
  ["rh", 74, 126],
  ["lk", 44, 170],
  ["rk", 76, 170],
  ["la", 42, 212],
  ["ra", 78, 212],
]
const BONES = [
  ["ls", "rs"],
  ["ls", "le"],
  ["le", "lw"],
  ["rs", "re"],
  ["re", "rw"],
  ["ls", "lh"],
  ["rs", "rh"],
  ["lh", "rh"],
  ["lh", "lk"],
  ["lk", "la"],
  ["rh", "rk"],
  ["rk", "ra"],
]
const AT = Object.fromEntries(JOINTS.map(([k, x, y]) => [k, { x, y }]))
const CORNERS = [
  "top-3.5 left-3.5 border-t-2 border-l-2 rounded-tl-md",
  "top-3.5 right-3.5 border-t-2 border-r-2 rounded-tr-md",
  "bottom-5 left-3.5 border-b-2 border-l-2 rounded-bl-md",
  "bottom-5 right-3.5 border-b-2 border-r-2 rounded-br-md",
]
const GLOW = "[filter:drop-shadow(0_0_6px_var(--color-accent))]"

/** Bốn góc ngắm như kính máy ảnh: sáng khi đang bật camera, mờ khi camera còn tắt. */
export function Viewfinder({ on }: { on: boolean }) {
  return CORNERS.map((c) => (
    <span
      key={c}
      aria-hidden
      className={cn(
        "absolute size-5.5",
        on ? "border-[var(--color-accent)] opacity-70" : "border-[var(--color-border)]",
        c,
      )}
    />
  ))
}

/**
 * Khung camera lúc chờ bộ nhận dạng tư thế (doc/mockup-khung-cho, phương án A người dùng chọn 10-08):
 * khớp sáng dần từ đầu xuống chân theo `progress` (0–1, số byte thật đã tải), thanh mảnh ở đáy cùng tiến độ.
 * Không có chữ trên khung.
 */
export function PoseLoading({ progress }: { progress: number }) {
  const lit = new Set(JOINTS.slice(0, Math.round(progress * JOINTS.length)).map(([k]) => k))
  const percent = Math.round(progress * 100)
  return (
    <div
      role="progressbar"
      aria-label="Bộ nhận dạng tư thế"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative grid h-[240px] place-items-center"
    >
      <Viewfinder on />
      <svg aria-hidden viewBox="0 0 120 230" className="h-[196px]">
        {BONES.map(([a, b]) => (
          <line
            key={a + b}
            x1={AT[a].x}
            y1={AT[a].y}
            x2={AT[b].x}
            y2={AT[b].y}
            strokeWidth={3}
            strokeLinecap="round"
            className={cn(
              "transition-[stroke,opacity] duration-300",
              lit.has(a) && lit.has(b) ? "stroke-[var(--color-accent)] opacity-55" : "stroke-[var(--color-border)]",
            )}
          />
        ))}
        {JOINTS.map(([k, x, y]) =>
          k === "head" ? (
            <circle
              key={k}
              cx={x}
              cy={y}
              r={14}
              fill="none"
              strokeWidth={3}
              className={cn(
                "transition-[stroke] duration-300",
                lit.has(k) ? cn("stroke-[var(--color-accent)]", GLOW) : "stroke-[var(--color-border)]",
              )}
            />
          ) : (
            <circle
              key={k}
              cx={x}
              cy={y}
              r={5}
              strokeWidth={2}
              className={cn(
                "transition-[fill,stroke] duration-300",
                lit.has(k)
                  ? cn("fill-[var(--color-accent)] stroke-[var(--color-accent)]", GLOW)
                  : "fill-[var(--color-surface-2)] stroke-[var(--color-border)]",
              )}
            />
          ),
        )}
      </svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[var(--color-surface-2)]">
        <div
          className="h-full bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
