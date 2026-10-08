import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { BackLink } from "@/features/review/components/BackLink"
import { FlowScreen } from "@/components/UserShell"
import { drawSkeleton, drawVideoMirrored, pill, readTheme, type HudTheme } from "@/features/review/utils/liveDraw"
import {
  advance,
  HOLD_MS,
  newSession,
  packFrame,
  readPose,
  REPS_PER_VIEW,
  VIEW_GUIDE,
  viewOf,
  type PoseRead,
  type Session,
} from "@/features/review/utils/livePose"
import { VIEW_NAME } from "@/lib/formMeasures"
import { useExercise, useSubmitLive } from "@/features/review/api/useReviews"

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
// Cùng file model analyzer tải (analyzer/pipeline/pose.py, MODEL_URLS["full"]). Không commit vào repo.
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
const FLASH_MS = 2000

type Screen = "consent" | "loading" | "live" | "sending" | "failed"

/**
 * Màn camera trực tiếp — doc/design-cham-form-llm-v1.md §3.2, lấy từ /live của analyzer-demo.
 * Pose chạy trong trình duyệt; chỉ toạ độ khớp được gửi lên, hình không rời máy. Hướng dẫn vẽ
 * trên canvas, không giọng nói. Chỉ hướng dẫn các góc có khớp cần kiểm của bài (exercise.checkViews),
 * doc/design-cham-form-nguong-v1.md §5.
 */
export function LiveCheckPage() {
  const navigate = useNavigate()
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const exercise = useExercise(exerciseId!)
  const views = exercise.data?.checkViews ?? []
  const submit = useSubmitLive(exerciseId!)
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const landmarker = useRef<PoseLandmarker | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const raf = useRef(0)
  const lastVideoTime = useRef(-1)
  const session = useRef<Session>(newSession())
  const [screen, setScreen] = useState<Screen>("consent")
  const [optIn, setOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rời trang giữa chừng thì tắt camera, không để đèn camera còn sáng.
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      stream.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  function stopCamera() {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  async function start() {
    setScreen("loading")
    setError(null)
    try {
      landmarker.current ??= await createLandmarker()
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      const v = video.current!
      v.srcObject = stream.current
      await v.play()
      session.current = newSession(views)
      setScreen("live")
      const theme = readTheme()
      const loop = () => {
        raf.current = requestAnimationFrame(loop)
        tick(theme)
      }
      loop()
    } catch (e) {
      stopCamera()
      setError(cameraError(e))
      setScreen("consent")
    }
  }

  function tick(theme: HudTheme) {
    const v = video.current
    const c = canvas.current
    const detector = landmarker.current
    if (!v || !c || !detector || !v.videoWidth) return
    // Màn 120–144 Hz gọi rAF nhiều lần cho mỗi frame camera 30 fps: chỉ xử lý frame mới, không thì
    // bộ đệm đầy frame trùng và bộ đếm rep nhận cùng một tư thế nhiều lần.
    if (v.currentTime === lastVideoTime.current) return
    lastVideoTime.current = v.currentTime
    if (c.width !== v.videoWidth) {
      c.width = v.videoWidth
      c.height = v.videoHeight
    }
    const ctx = c.getContext("2d")!
    const now = performance.now()
    const result = detector.detectForVideo(v, now)
    const lm = result.landmarks[0] ?? null
    const wl = result.worldLandmarks[0] ?? null
    drawVideoMirrored(ctx, v)
    if (lm) drawSkeleton(ctx, lm, theme)
    const pose = readPose(lm, wl)
    const s = session.current
    advance(s, pose, packFrame(lm, wl), now)
    drawHud(ctx, theme, s, pose, now)
    if (s.stage === "done") send()
  }

  function send() {
    stopCamera()
    setScreen("sending")
    submit.mutate(session.current.clips, {
      onSuccess: (review) => navigate(`/form-check/result/${review.id}`, { replace: true }),
      onError: () => setScreen("failed"),
    })
  }

  function restart() {
    stopCamera()
    setScreen("consent")
  }

  const quota = submit.error instanceof ApiError && submit.error.status === 429
  const placeholder =
    screen === "loading"
      ? "Đang tải bộ nhận dạng tư thế (khoảng 10 MB)…"
      : screen === "sending"
        ? "Đang gửi số đo để chấm…"
        : screen === "failed"
          ? "Chưa gửi được. Số đo vẫn còn trên máy, bấm Gửi lại."
          : "Camera chưa bật."

  return (
    <FlowScreen>
      {/* Bấm nhầm bài thì quay lại chọn bài khác; rời trang thì effect dọn dẹp tự tắt camera. */}
      <BackLink to="/form-check">← Chọn bài khác</BackLink>
      <h1 className="mt-2.5 text-[26px] font-extrabold tracking-[-0.02em]">
        {exercise.data ? `Chấm form: ${exercise.data.nameVi ?? exercise.data.nameEn}` : "Chấm form"}
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Đặt máy cách 2–3 m, cả người trong khung. Làm {REPS_PER_VIEW} rep mỗi góc:{" "}
        {views.map((v) => VIEW_NAME[v]).join(" → ")}.
      </p>
      {exercise.data && views.length === 0 && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">Bài này chưa chấm form được.</p>
      )}

      <div className="relative mt-4 overflow-hidden rounded-xl bg-[var(--color-surface)]">
        {/* Video chỉ là nguồn hình cho canvas; ẩn bằng opacity để trình duyệt vẫn giải mã frame. */}
        <video ref={video} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />
        <canvas
          ref={canvas}
          role="img"
          aria-label="Hình camera kèm hướng dẫn vào khung, xoay góc và đếm rep"
          className={screen === "live" ? "block w-full" : "hidden"}
        />
        {screen !== "live" && (
          <div className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
            {placeholder}
          </div>
        )}
      </div>

      {screen === "consent" && (
        <label className="mt-4 flex cursor-pointer gap-2.5 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface-2)] p-3.5">
          <Checkbox className="mt-0.5" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          <span className="text-[13px] leading-relaxed">
            Tôi đồng ý gửi toạ độ khớp để chấm.{" "}
            <span className="text-[var(--color-text-muted)]">
              Hình ảnh không rời máy bạn. Máy chủ chỉ nhận các con số vị trí khớp.
            </span>
          </span>
        </label>
      )}

      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      {screen === "failed" && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">
          {quota ? "Bạn đã dùng hết lượt chấm trong 7 ngày qua. Thử lại vào tuần sau." : submit.error?.message}
        </p>
      )}

      <div className="flex-1" />
      <div className="mt-6 flex gap-2.5">
        {screen === "consent" && (
          <Button className="w-full" disabled={!optIn || views.length === 0} onClick={() => void start()}>
            Bật camera
          </Button>
        )}
        {screen === "live" && (
          <>
            <Button variant="secondary" className="flex-1" onClick={restart}>
              Dừng
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                session.current = newSession(views)
              }}
            >
              Làm lại
            </Button>
          </>
        )}
        {screen === "failed" && (
          <>
            <Button variant="secondary" className="flex-1" onClick={restart}>
              Tập lại
            </Button>
            {!quota && (
              <Button className="flex-1" onClick={send}>
                Gửi lại
              </Button>
            )}
          </>
        )}
      </div>
      {screen === "consent" && (
        <>
          <div className="mt-3.5 flex items-center gap-2.5 text-xs text-[var(--color-text-muted)] before:h-px before:flex-1 before:bg-[var(--color-border)] after:h-px after:flex-1 after:bg-[var(--color-border)]">
            hoặc
          </div>
          {/* Lối gửi clip quay sẵn từng là dòng chữ nhỏ gạch chân, người dùng không thấy; làm thành nút. */}
          <Link
            to={`/form-check/${exerciseId}`}
            className="mt-3 flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <svg
              aria-hidden
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--color-accent)]"
            >
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Gửi video đã quay sẵn</span>
              <span className="block text-xs text-[var(--color-text-muted)]">
                Chọn clip có sẵn trong máy, không cần bật camera
              </span>
            </span>
            <span aria-hidden className="text-[var(--color-text-muted)]">
              ›
            </span>
          </Link>
        </>
      )}
    </FlowScreen>
  )
}

/** Chữ hướng dẫn trên hình camera, theo từng bước của máy trạng thái. */
function drawHud(ctx: CanvasRenderingContext2D, t: HudTheme, s: Session, pose: PoseRead, now: number) {
  const { width: w, height: h } = ctx.canvas
  const size = Math.round(w * 0.03)
  const top = size * 1.4
  const bottom = h - size * 1.6
  const code = s.views[Math.min(s.step, s.views.length - 1)]
  const view = VIEW_GUIDE[code]
  const holding = (since: number | null) =>
    `Giữ nguyên… ${Math.round(Math.min(1, since === null ? 0 : (now - since) / HOLD_MS) * 100)}%`
  const flash = s.flash && now - s.flash.at < FLASH_MS ? s.flash.text : null

  if (s.stage === "frame") {
    pill(ctx, t, "Vào khung hình", w / 2, top, size, t.text)
    pill(ctx, t, pose.why ?? holding(s.okSince), w / 2, bottom, size, pose.inFrame ? t.accent : t.warn)
  } else if (s.stage === "pose") {
    const ok = pose.inFrame && viewOf(s.ratio) === code
    pill(ctx, t, `Góc ${view.label} (${s.step + 1}/${s.views.length})`, w / 2, top, size, t.text)
    pill(ctx, t, pose.why ?? (ok ? holding(s.okSince) : view.hint), w / 2, bottom, size, ok ? t.accent : t.warn)
    if (flash) pill(ctx, t, flash, w / 2, bottom - size * 2.2, size * 0.85, t.accent)
  } else if (s.stage === "countdown") {
    pill(ctx, t, `Chuẩn bị, góc ${view.label}`, w / 2, top, size, t.text)
    pill(ctx, t, String(Math.max(1, Math.ceil((s.countdownEnd - now) / 1000))), w / 2, h / 2, size * 4, t.text)
  } else if (s.stage === "reps") {
    pill(ctx, t, `Góc ${view.label}: làm ${REPS_PER_VIEW} rep`, w / 2, top, size, t.text)
    pill(ctx, t, `${s.counter.count}/${REPS_PER_VIEW}`, w - size * 4, h / 2, size * 3, t.accent)
    if (flash) pill(ctx, t, flash, w / 2, bottom, size, t.accent)
    if (pose.why) pill(ctx, t, pose.why, w / 2, bottom - size * 2.2, size * 0.85, t.danger)
  }
}

async function createLandmarker(): Promise<PoseLandmarker> {
  // Nạp thư viện lúc bấm nút, không nằm trong bundle chính: phần lớn người dùng không mở màn này.
  const mp = await import("@mediapipe/tasks-vision")
  const files = await mp.FilesetResolver.forVisionTasks(WASM_URL)
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
  })
  try {
    return await mp.PoseLandmarker.createFromOptions(files, options("GPU"))
  } catch {
    // Máy không có WebGL2 thì chạy CPU: chậm hơn nhưng vẫn dùng được.
    return await mp.PoseLandmarker.createFromOptions(files, options("CPU"))
  }
}

function cameraError(e: unknown): string {
  if (!window.isSecureContext) return "Trình duyệt chỉ cho dùng camera trên HTTPS hoặc localhost."
  const name = e instanceof DOMException ? e.name : ""
  if (name === "NotAllowedError")
    return "Bạn chưa cho trang này dùng camera. Bấm biểu tượng camera trên thanh địa chỉ, chọn Cho phép, rồi thử lại."
  if (name === "NotFoundError") return "Không tìm thấy camera trên máy này."
  if (name === "NotReadableError") return "Camera đang bị ứng dụng khác dùng. Tắt ứng dụng đó rồi thử lại."
  return "Không tải được bộ nhận dạng tư thế. Kiểm tra mạng rồi thử lại."
}
