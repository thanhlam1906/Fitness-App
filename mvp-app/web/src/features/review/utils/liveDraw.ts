import type { Landmark } from "./livePose"

/** Màu và font HUD đọc từ token CSS lúc chạy: canvas không dùng được var(), mà token là nguồn duy nhất. */
export type HudTheme = { accent: string; warn: string; danger: string; text: string; glass: string; font: string }

export function readTheme(): HudTheme {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(name).trim()
  return {
    accent: token("--color-accent"),
    warn: token("--color-warn"),
    danger: token("--color-danger"),
    text: token("--color-text"),
    glass: token("--color-glass"),
    font: token("--font-sans") || "system-ui, sans-serif",
  }
}

/** Hình camera lật gương cho giống soi gương. Toạ độ gửi lên vẫn là toạ độ gốc. */
export function drawVideoMirrored(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()
}

const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32],
]
const BONE_JOINTS = [...new Set(BONES.flat())]

export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: Landmark[], t: HudTheme) {
  const { width, height } = ctx.canvas
  const at = (i: number) => ({ x: (1 - lm[i].x) * width, y: lm[i].y * height }) // lật như hình
  ctx.lineWidth = 3
  ctx.strokeStyle = t.accent
  for (const [a, b] of BONES) {
    const p = at(a)
    const q = at(b)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
  }
  for (const i of BONE_JOINTS) {
    const p = at(i)
    const v = lm[i].visibility ?? 0
    // Màu theo độ rõ: người tập thấy ngay khớp nào máy chưa bắt được.
    ctx.fillStyle = v > 0.8 ? t.accent : v > 0.5 ? t.warn : t.danger
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Nhãn chữ trên nền kính, căn giữa tại (x, y). */
export function pill(
  ctx: CanvasRenderingContext2D,
  t: HudTheme,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.font = `700 ${size}px ${t.font}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const w = ctx.measureText(text).width + size * 1.2
  const h = size * 1.7
  ctx.fillStyle = t.glass
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
