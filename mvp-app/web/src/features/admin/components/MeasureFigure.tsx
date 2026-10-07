import type { MeasureKey, ViewCode } from "@/lib/formMeasures"

type P = [number, number]
type Bone = [string, string]
type Marks = { wedges: string[]; dashes: [P, P][]; rings: P[] }

// Toạ độ trong viewBox "30 10 140 240". Tư thế hơi gập để mọi góc đều nhìn thấy cung đo.
const SIDE: Record<string, P> = {
  sho: [104, 64], elb: [120, 100], wri: [140, 114], hip: [90, 140], knee: [124, 180],
  ank: [106, 230], heel: [96, 238], toe: [134, 240],
}
const FRONT: Record<string, P> = {
  ls: [78, 62], rs: [122, 62], le: [66, 98], re: [134, 98], lw: [82, 124], rw: [118, 124],
  lh: [87, 140], rh: [113, 140], lk: [92, 186], rk: [108, 186], la: [80, 232], ra: [120, 232],
  lt: [70, 240], rt: [130, 240],
}
const SIDE_BONES: Bone[] = [["sho", "hip"], ["sho", "elb"], ["elb", "wri"], ["hip", "knee"], ["knee", "ank"], ["heel", "toe"]]
const ARMS: Bone[] = [["ls", "lh"], ["ls", "le"], ["rs", "rh"], ["rs", "re"]]
const LEGS: Bone[] = [["lh", "lk"], ["lk", "la"], ["rh", "rk"], ["rk", "ra"]]
const FRONT_BONES: Bone[] = [["ls", "rs"], ["lh", "rh"], ...ARMS, ["le", "lw"], ["re", "rw"], ...LEGS, ["la", "lt"], ["ra", "rt"]]
const FRONT_ONLY: MeasureKey[] = ["valgus", "asym_knee", "asym_hip", "asym_shoulder"]

const SIDE_HL: Partial<Record<MeasureKey, Bone[]>> = {
  knee: [["hip", "knee"], ["knee", "ank"]],
  hip: [["sho", "hip"], ["hip", "knee"]],
  ankle: [["knee", "ank"], ["heel", "toe"]],
  elbow: [["sho", "elb"], ["elb", "wri"]],
  shoulder: [["sho", "hip"], ["sho", "elb"]],
  line: [["sho", "hip"]],
  torso: [["sho", "hip"]],
}
const FRONT_HL: Partial<Record<MeasureKey, Bone[]>> = {
  shoulder: ARMS,
  asym_shoulder: ARMS,
  valgus: LEGS,
  asym_knee: LEGS,
  asym_hip: [["ls", "lh"], ["lh", "lk"], ["rs", "rh"], ["rh", "rk"]],
}

/** Hình quạt đánh dấu góc tại c, giữa hai hướng c→a và c→b, lấy phía góc nhỏ. */
function arc(c: P, a: P, b: P, r = 22): string {
  const a1 = Math.atan2(a[1] - c[1], a[0] - c[0])
  let d = Math.atan2(b[1] - c[1], b[0] - c[0]) - a1
  while (d <= -Math.PI) d += 2 * Math.PI
  while (d > Math.PI) d -= 2 * Math.PI
  const at = (t: number) => `${(c[0] + r * Math.cos(t)).toFixed(1)},${(c[1] + r * Math.sin(t)).toFixed(1)}`
  return `M${c[0]},${c[1]} L${at(a1)} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${at(a1 + d)} Z`
}

function sideMarks(m: MeasureKey): Marks {
  const j = SIDE
  const none: Marks = { wedges: [], dashes: [], rings: [] }
  const up = (p: P, len: number): P => [p[0], p[1] - len]
  switch (m) {
    case "knee": return { ...none, wedges: [arc(j.knee, j.hip, j.ank)] }
    case "hip": return { ...none, wedges: [arc(j.hip, j.sho, j.knee)] }
    case "ankle": return { ...none, wedges: [arc(j.ank, j.knee, j.toe, 18)] }
    case "elbow": return { ...none, wedges: [arc(j.elb, j.sho, j.wri, 18)] }
    case "shoulder": return { ...none, wedges: [arc(j.sho, j.hip, j.elb, 20)] }
    case "line": return { ...none, wedges: [arc(j.hip, j.sho, j.ank, 24)], dashes: [[j.hip, j.ank]] }
    case "torso": return { ...none, wedges: [arc(j.hip, up(j.hip, 75), j.sho, 28)], dashes: [[j.hip, up(j.hip, 75)]] }
    default: return none
  }
}

function frontMarks(m: MeasureKey): Marks {
  const k = FRONT
  const none: Marks = { wedges: [], dashes: [], rings: [] }
  switch (m) {
    case "shoulder":
    case "asym_shoulder": return { ...none, wedges: [arc(k.ls, k.lh, k.le, 16), arc(k.rs, k.rh, k.re, 16)] }
    case "valgus": return { wedges: [], dashes: [[k.lh, k.la], [k.rh, k.ra]], rings: [k.lk, k.rk] }
    case "asym_knee": return { ...none, wedges: [arc(k.lk, k.lh, k.la, 14), arc(k.rk, k.rh, k.ra, 14)] }
    case "asym_hip": return { ...none, wedges: [arc(k.lh, k.ls, k.lk, 14), arc(k.rh, k.rs, k.rk, 14)] }
    default: return none
  }
}

/** Hình người minh hoạ chỗ đo của một khớp, nhìn từ góc đang chọn. */
export function MeasureFigure({ view, measure }: { view: ViewCode; measure: MeasureKey | null }) {
  const front = measure ? FRONT_ONLY.includes(measure) || (measure === "shoulder" && view === "FRONTAL") : view === "FRONTAL"
  const pts = front ? FRONT : SIDE
  const bones = front ? FRONT_BONES : SIDE_BONES
  const hl = (measure && (front ? FRONT_HL : SIDE_HL)[measure]) || []
  const marks = measure ? (front ? frontMarks : sideMarks)(measure) : { wedges: [], dashes: [], rings: [] }
  const lit = (a: string, b: string) => hl.some(([p, q]) => p === a && q === b)
  const neck: [P, P] = front ? [[100, 62], [100, 41]] : [[104, 64], [113, 42]]
  const head: P = front ? [100, 28] : [118, 30]

  return (
    <svg viewBox="30 10 140 240" role="img" aria-label="Hình người, chỗ sáng là chỗ đo" className="block h-auto w-full">
      <line x1={40} y1={244} x2={160} y2={244} stroke="var(--color-border)" strokeWidth={2} />
      {marks.wedges.map((d) => (
        <path key={d} d={d} fill="var(--color-accent-tint)" stroke="var(--color-accent)" strokeWidth={1.5} />
      ))}
      <Line a={neck[0]} b={neck[1]} on={false} />
      <circle cx={head[0]} cy={head[1]} r={13} fill="none" stroke="var(--color-text-muted)" strokeOpacity={0.5} strokeWidth={6} />
      {bones.map(([a, b]) => (
        <Line key={a + b} a={pts[a]} b={pts[b]} on={lit(a, b)} />
      ))}
      {marks.dashes.map(([a, b]) => (
        <line key={`${a}${b}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--color-text)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />
      ))}
      {marks.rings.map((p) => (
        <circle key={`${p}`} cx={p[0]} cy={p[1]} r={9} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />
      ))}
    </svg>
  )
}

function Line({ a, b, on }: { a: P; b: P; on: boolean }) {
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={on ? "var(--color-accent)" : "var(--color-text-muted)"}
      strokeOpacity={on ? 1 : 0.5}
      strokeWidth={6}
      strokeLinecap="round"
    />
  )
}
