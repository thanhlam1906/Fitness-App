/**
 * Phần thuần của màn camera (doc/design-cham-form-llm-v1.md §3.2): đọc pose một frame, đếm rep
 * chung cho mọi bài, máy trạng thái hướng dẫn, đóng gói frame gửi lên. Không đụng DOM hay
 * MediaPipe nên test bằng số giả được.
 *
 * Số rep đếm ở đây chỉ để hướng dẫn người tập. Server tách rep lại (segment_generic) và lấy kết
 * quả của server.
 */

export type Landmark = { x: number; y: number; z: number; visibility?: number }
export type Angles = { hip: number; knee: number; elbow: number; shoulder: number }
export type PoseRead = { inFrame: boolean; why: string | null; ratio: number | null; angles: Angles | null }
export type ViewCode = "FRONTAL" | "SAGITTAL" | "DIAGONAL"
export type FrameJson = { norm: number[][]; vis: number[]; world: number[][] } | null

export const VIEWS = [
  { code: "SAGITTAL", label: "NGANG", hint: "Xoay ngang: vai vuông góc với camera" },
  { code: "FRONTAL", label: "CHÍNH DIỆN", hint: "Quay mặt về phía camera" },
] as const
export type CaptureView = (typeof VIEWS)[number]["code"]

export const REPS_PER_VIEW = 5
export const HOLD_MS = 1500
export const COUNTDOWN_MS = 3000
export const MAX_FRAMES = 3000

const MARGIN = 0.03
const MIN_VIS = 0.5
// Vai, hông, gối, cổ chân: thấy rõ cả tám thì mới coi là "cả người trong khung".
const KEY_IDS = [11, 12, 23, 24, 25, 26, 27, 28]
// Cùng hai ngưỡng với analyzer/pipeline/viewpoint.py. Ở đây chỉ để hướng dẫn xoay người;
// server tự phân loại góc lại.
const FRONTAL_MIN_RATIO = 0.42
const SAGITTAL_MAX_RATIO = 0.28
const MIN_ROM_DEG = 30
const BAND = 0.15

type Vec = { x: number; y: number; z: number }
const sub = (p: Vec, q: Vec): Vec => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z })
const mid = (p: Vec, q: Vec): Vec => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 })

function angleDeg(a: Vec, b: Vec): number {
  const na = Math.hypot(a.x, a.y, a.z)
  const nb = Math.hypot(b.x, b.y, b.z)
  if (na < 1e-9 || nb < 1e-9) return 0
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (na * nb)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

/** Bốn góc ứng viên, tính như FrameMetrics của server (world landmarks). */
export function anglesOf(wl: Landmark[]): Angles {
  const at = (a: number, b: number, c: number) => angleDeg(sub(wl[a], wl[b]), sub(wl[c], wl[b]))
  const shoulder = mid(wl[11], wl[12])
  const hip = mid(wl[23], wl[24])
  const knee = mid(wl[25], wl[26])
  return {
    hip: angleDeg(sub(shoulder, hip), sub(knee, hip)),
    knee: Math.min(at(23, 25, 27), at(24, 26, 28)),
    elbow: (at(11, 13, 15) + at(12, 14, 16)) / 2,
    shoulder: (at(23, 11, 13) + at(24, 12, 14)) / 2,
  }
}

export function readPose(lm: Landmark[] | null, wl: Landmark[] | null): PoseRead {
  if (!lm || !wl) {
    return { inFrame: false, why: "Không thấy người, hãy đứng vào trước camera", ratio: null, angles: null }
  }
  const vis = KEY_IDS.map((i) => lm[i].visibility ?? 0)
  const xs = KEY_IDS.map((i) => lm[i].x)
  const ys = KEY_IDS.map((i) => lm[i].y)
  const shoulder = mid(lm[11], lm[12])
  const hip = mid(lm[23], lm[24])
  // Khoảng cách 2D chứ không chỉ chênh y: push-up nằm ngang vẫn đo được, như server.
  const torso = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y)
  let why: string | null = null
  if (Math.min(...vis) < MIN_VIS) why = "Chưa thấy rõ cả người. Lùi lại, đủ sáng, đừng để vật che"
  else if (Math.min(...ys) < MARGIN || Math.max(...ys) > 1 - MARGIN || lm[0].y < MARGIN)
    why = "Lùi lại để cả người, từ đầu tới chân, nằm trong khung"
  else if (Math.min(...xs) < MARGIN || Math.max(...xs) > 1 - MARGIN) why = "Đứng vào giữa khung hình"
  else if (torso < 0.12) why = "Tiến lại gần camera hơn một chút"
  return {
    inFrame: why === null,
    why,
    ratio: torso > 0.03 ? Math.abs(lm[11].x - lm[12].x) / torso : null,
    angles: anglesOf(wl),
  }
}

export function viewOf(ratio: number): ViewCode {
  if (ratio >= FRONTAL_MIN_RATIO) return "FRONTAL"
  if (ratio <= SAGITTAL_MAX_RATIO) return "SAGITTAL"
  return "DIAGONAL"
}

const JOINTS = ["hip", "knee", "elbow", "shoulder"] as const
type Joint = (typeof JOINTS)[number]

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Đếm rep chung cho mọi bài, cùng ý với segment_generic của server: góc nào dao động nhiều nhất
 * là nhịp của động tác; một rep = rời tư thế đầu đi quá giữa biên độ rồi trở về, có vùng trễ.
 */
export class RepCounter {
  count = 0
  private low: Record<Joint, number> = { hip: Infinity, knee: Infinity, elbow: Infinity, shoulder: Infinity }
  private high: Record<Joint, number> = { hip: -Infinity, knee: -Infinity, elbow: -Infinity, shoulder: -Infinity }
  private first: Record<Joint, number[]> = { hip: [], knee: [], elbow: [], shoulder: [] }
  private dominant: Joint | null = null
  private away = false

  /** Góc của một frame. Trả true đúng frame vừa xong một rep. */
  push(a: Angles): boolean {
    let best: Joint | null = null
    for (const j of JOINTS) {
      this.low[j] = Math.min(this.low[j], a[j])
      this.high[j] = Math.max(this.high[j], a[j])
      if (this.first[j].length < 10) this.first[j].push(a[j])
      const rom = this.high[j] - this.low[j]
      if (rom >= MIN_ROM_DEG && (best === null || rom > this.high[best] - this.low[best])) best = j
    }
    if (best === null) return false
    if (best !== this.dominant) {
      this.dominant = best
      this.away = false
    }
    const middle = (this.low[best] + this.high[best]) / 2
    const band = (this.high[best] - this.low[best]) * BAND
    // Tư thế đầu ở phía góc lớn (squat, push-up) thì rep đi xuống; phía góc nhỏ (nâng tay) thì đi lên.
    const rel = (median(this.first[best]) >= middle ? 1 : -1) * (a[best] - middle)
    if (!this.away && rel < -band) {
      this.away = true
    } else if (this.away && rel > band) {
      this.away = false
      this.count++
      return true
    }
    return false
  }
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4

/** Frame gửi lên: toạ độ khớp làm tròn 4 chữ số, không có hình. null = không thấy người. */
export function packFrame(lm: Landmark[] | null, wl: Landmark[] | null): FrameJson {
  if (!lm || !wl) return null
  return {
    norm: lm.map((q) => [r4(q.x), r4(q.y), r4(q.z)]),
    vis: lm.map((q) => r4(q.visibility ?? 0)),
    world: wl.map((q) => [r4(q.x), r4(q.y), r4(q.z)]),
  }
}

export type Stage = "frame" | "pose" | "countdown" | "reps" | "done"
export type Session = {
  stage: Stage
  step: number
  okSince: number | null
  countdownEnd: number
  ratio: number
  buffer: FrameJson[]
  clips: { view: CaptureView; frames: FrameJson[] }[]
  counter: RepCounter
  flash: { text: string; at: number } | null
}

export function newSession(): Session {
  return {
    stage: "frame",
    step: 0,
    okSince: null,
    countdownEnd: 0,
    ratio: 0.35,
    buffer: [],
    clips: [],
    counter: new RepCounter(),
    flash: null,
  }
}

function pushFrame(s: Session, frame: FrameJson) {
  if (s.buffer.length >= MAX_FRAMES) s.buffer.shift()
  s.buffer.push(frame)
}

/** Một frame vào máy trạng thái §3.2. Đổi `s` tại chỗ; page đọc `s` để vẽ HUD. */
export function advance(s: Session, pose: PoseRead, frame: FrameJson, now: number): void {
  // Làm mượt như demo: một frame lệch không làm nhảy góc nhìn.
  if (pose.ratio !== null) s.ratio = s.ratio * 0.85 + pose.ratio * 0.15
  const view = VIEWS[s.step]
  const posed = pose.inFrame && view !== undefined && viewOf(s.ratio) === view.code
  switch (s.stage) {
    case "frame":
    case "pose": {
      const ok = s.stage === "frame" ? pose.inFrame : posed
      if (!ok) {
        s.okSince = null
        break
      }
      s.okSince ??= now
      if (now - s.okSince < HOLD_MS) break
      s.okSince = null
      if (s.stage === "frame") {
        s.stage = "pose"
      } else {
        s.stage = "countdown"
        s.countdownEnd = now + COUNTDOWN_MS
        s.buffer = []
      }
      break
    }
    case "countdown":
      if (!posed) {
        s.stage = "pose"
        break
      }
      pushFrame(s, frame)
      if (now >= s.countdownEnd) {
        s.stage = "reps"
        s.counter = new RepCounter()
      }
      break
    case "reps":
      if (view === undefined) break
      pushFrame(s, frame)
      if (pose.angles && s.counter.push(pose.angles)) s.flash = { text: `Rep ${s.counter.count} ✓`, at: now }
      if (s.counter.count >= REPS_PER_VIEW) {
        s.clips.push({ view: view.code, frames: s.buffer })
        s.buffer = []
        s.flash = { text: `Xong ${REPS_PER_VIEW} rep góc ${view.label.toLowerCase()}`, at: now }
        s.step++
        s.stage = s.step < VIEWS.length ? "pose" : "done"
      }
      break
  }
}
