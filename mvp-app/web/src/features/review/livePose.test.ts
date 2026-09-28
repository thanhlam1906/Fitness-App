import { describe, expect, it } from "vitest"
import {
  advance,
  COUNTDOWN_MS,
  HOLD_MS,
  MAX_FRAMES,
  newSession,
  packFrame,
  readPose,
  RepCounter,
  REPS_PER_VIEW,
  viewOf,
  type Angles,
  type Landmark,
  type PoseRead,
} from "./livePose"

/** 33 khớp, người đứng thẳng giữa khung, thấy rõ. Chỉ các khớp readPose/anglesOf đọc có vị trí thật. */
function standing(): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }))
  const at: [number, number, number][] = [
    [0, 0.5, 0.1], // mũi
    [11, 0.45, 0.25], // vai trái
    [12, 0.55, 0.25], // vai phải
    [13, 0.45, 0.4], // khuỷu
    [14, 0.55, 0.4],
    [15, 0.45, 0.55], // cổ tay
    [16, 0.55, 0.55],
    [23, 0.47, 0.55], // hông
    [24, 0.53, 0.55],
    [25, 0.47, 0.75], // gối
    [26, 0.53, 0.75],
    [27, 0.47, 0.95], // cổ chân
    [28, 0.53, 0.95],
  ]
  for (const [i, x, y] of at) lm[i] = { x, y, z: 0, visibility: 1 }
  return lm
}

const STAND: Angles = { hip: 175, knee: 175, elbow: 170, shoulder: 10 }

/** n rep: mỗi rep giữ 8 frame ở `from`, đi tới `to` trong 15 frame rồi về trong 15 frame. */
function reps(n: number, joint: keyof Angles, from: number, to: number): Angles[] {
  const out: Angles[] = []
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < 8; k++) out.push({ ...STAND, [joint]: from })
    for (let k = 1; k <= 15; k++) out.push({ ...STAND, [joint]: from + ((to - from) * k) / 15 })
    for (let k = 14; k >= 0; k--) out.push({ ...STAND, [joint]: from + ((to - from) * k) / 15 })
  }
  return out
}

describe("readPose", () => {
  it("không thấy người thì nói rõ", () => {
    const r = readPose(null, null)
    expect(r.inFrame).toBe(false)
    expect(r.why).toMatch(/Không thấy người/)
  })

  it("đứng thẳng giữa khung: trong khung, hông và gối duỗi gần 180", () => {
    const lm = standing()
    const r = readPose(lm, lm)
    expect(r.inFrame).toBe(true)
    expect(r.angles!.hip).toBeCloseTo(180, 0)
    expect(r.angles!.knee).toBeCloseTo(180, 0)
    expect(r.ratio).toBeCloseTo(0.1 / 0.3, 3)
  })

  it("chân chạm mép dưới thì bảo lùi lại", () => {
    const lm = standing()
    lm[27] = { ...lm[27], y: 0.99 }
    expect(readPose(lm, lm).why).toMatch(/Lùi lại/)
  })

  it("khớp mờ thì chưa tính là trong khung", () => {
    const lm = standing()
    lm[25] = { ...lm[25], visibility: 0.2 }
    expect(readPose(lm, lm).inFrame).toBe(false)
  })
})

describe("viewOf", () => {
  it("cùng hai ngưỡng với server", () => {
    expect(viewOf(0.5)).toBe("FRONTAL")
    expect(viewOf(0.2)).toBe("SAGITTAL")
    expect(viewOf(0.35)).toBe("DIAGONAL")
  })
})

describe("RepCounter", () => {
  const count = (frames: Angles[]) => {
    const c = new RepCounter()
    frames.forEach((a) => c.push(a))
    return c.count
  }
  it("squat: góc hông giảm rồi tăng", () => expect(count(reps(5, "hip", 175, 70))).toBe(5))
  it("nâng tay: góc vai tăng rồi giảm", () => expect(count(reps(5, "shoulder", 10, 90))).toBe(5))
  it("rung nhẹ dưới 30 độ không tính rep", () => expect(count(reps(5, "knee", 175, 160))).toBe(0))
})

describe("advance", () => {
  const pose = (ratio: number, angles: Angles = STAND): PoseRead => ({ inFrame: true, why: null, ratio, angles })
  const FRAME = { norm: [[0, 0, 0]], vis: [1], world: [[0, 0, 0]] }
  const HOLD = Math.ceil(HOLD_MS / 33) + 1
  const COUNT = Math.ceil(COUNTDOWN_MS / 33) + 1

  function run() {
    const s = newSession()
    let t = 0
    const feed = (p: PoseRead, frames = 1) => {
      for (let i = 0; i < frames; i++) advance(s, p, FRAME, (t += 33))
    }
    return { s, feed }
  }

  it("đi hết góc ngang rồi chính diện, mỗi góc một clip", () => {
    const { s, feed } = run()
    feed(pose(0.2), HOLD) // vào khung
    expect(s.stage).toBe("pose")
    feed(pose(0.2), HOLD) // đúng góc ngang
    expect(s.stage).toBe("countdown")
    feed(pose(0.2), COUNT)
    expect(s.stage).toBe("reps")
    reps(REPS_PER_VIEW, "hip", 175, 70).forEach((a) => feed(pose(0.2, a)))
    expect(s.stage).toBe("pose")
    expect(s.clips.map((c) => c.view)).toEqual(["SAGITTAL"])
    feed(pose(0.6), HOLD + 10) // xoay chính diện; +10 frame cho góc nhìn làm mượt đổi kịp
    expect(s.stage).toBe("countdown")
    feed(pose(0.6), COUNT)
    reps(REPS_PER_VIEW, "hip", 175, 70).forEach((a) => feed(pose(0.6, a)))
    expect(s.stage).toBe("done")
    expect(s.clips.map((c) => c.view)).toEqual(["SAGITTAL", "FRONTAL"])
    expect(s.clips[0].frames.length).toBeGreaterThan(0)
  })

  it("bộ đệm đầy thì giữ phần đầu: server cần tư thế đầu lúc đếm ngược", () => {
    const s = newSession()
    let t = 0
    for (let i = 0; i < 2 * HOLD; i++) advance(s, pose(0.2), null, (t += 33))
    expect(s.stage).toBe("countdown")
    for (let i = 0; i < MAX_FRAMES + 50; i++) {
      advance(s, pose(0.2), { norm: [[i, 0, 0]], vis: [1], world: [[0, 0, 0]] }, (t += 33))
    }
    expect(s.buffer).toHaveLength(MAX_FRAMES)
    expect(s.buffer[0]!.norm[0][0]).toBe(0)
  })

  it("rời khung lúc đếm ngược thì quay lại bước xoay người", () => {
    const { s, feed } = run()
    feed(pose(0.2), HOLD)
    feed(pose(0.2), HOLD)
    expect(s.stage).toBe("countdown")
    feed({ inFrame: false, why: "Đứng vào giữa khung hình", ratio: null, angles: null })
    expect(s.stage).toBe("pose")
  })
})

describe("packFrame", () => {
  it("làm tròn 4 chữ số, không thấy người thì null", () => {
    const lm = standing()
    lm[0] = { x: 0.123456, y: 0.1, z: 0, visibility: 0.99999 }
    const f = packFrame(lm, lm)!
    expect(f.norm[0]).toEqual([0.1235, 0.1, 0])
    expect(f.vis[0]).toBe(1)
    expect(f.norm).toHaveLength(33)
    expect(packFrame(null, null)).toBeNull()
  })
})
