import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { ApiError } from "@/api/client"
import { Stepper } from "@/components/Stepper"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FlowScreen } from "@/components/UserShell"
import { parseFilmingGuide, VIEWPOINT_OPTIONS, type FilmingGuide } from "./types"
import { useExercise, useSubmitReview } from "./useReviews"

const MAX_CLIPS = 3

/** Hướng dẫn mặc định khi bài chưa có `filming_guide` — đúng bộ 5 dòng trong design. */
const DEFAULT_STEPS = [
  "Đặt điện thoại chéo 45° phía trước, dựng đứng.",
  "Cách 2–3 m, ngang tầm hông.",
  "Cả người và thanh tạ trong khung suốt cả set.",
  "Ánh sáng từ phía trước, tránh ngược sáng.",
  "Quay 3–5 rep là đủ, tối đa 30 giây.",
]

/**
 * Màn 8 concept-frontend-v1.md — hướng dẫn quay và gửi clip.
 *
 * "Opt-in gửi clip nằm ở đây, không ở nơi khác": người dùng đọc điều gì sẽ xảy
 * ra với clip NGAY CẠNH chỗ họ đồng ý, không phải trong một trang điều khoản.
 */
export function FilmingGuidePage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  const exercise = useExercise(exerciseId!)
  const submit = useSubmitReview()

  const [files, setFiles] = useState<File[]>([])
  const [viewpoints, setViewpoints] = useState<string[]>([])
  const [optIn, setOptIn] = useState(false)

  if (exercise.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if (exercise.isError) {
    return <p className="text-sm text-[var(--color-danger)]">{exercise.error.message}</p>
  }

  const name = exercise.data!.nameVi ?? exercise.data!.nameEn
  const steps = guideSteps(parseFilmingGuide(exercise.data!.filmingGuide))
  const quotaExceeded = submit.error instanceof ApiError && submit.error.status === 429

  function pickFiles(fileList: FileList | null) {
    const picked = Array.from(fileList ?? []).slice(0, MAX_CLIPS)
    setFiles(picked)
    setViewpoints(picked.map((_, i) => viewpoints[i] ?? VIEWPOINT_OPTIONS[0].value))
  }

  return (
    <FlowScreen>
      <Stepper label="Kiểm tra form" steps={3} current={1} />
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Quay một set {name}</h1>

      {/* F2 §8 còn treo: hình minh hoạ khung người cần chụp hoặc vẽ, không code được. */}
      <div className="mt-4 flex h-[180px] items-center justify-center rounded-xl bg-[var(--color-surface)] px-6 text-center text-xs text-[var(--color-text-muted)]">
        Hình khung người — góc 45°, cả người và tạ trong khung
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3 text-sm leading-snug"
          >
            <span className="num font-bold text-[var(--color-accent)]">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface-2)] p-3.5">
        <label className="flex cursor-pointer gap-2.5">
          <Checkbox
            className="mt-0.5"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <span className="text-[13px] leading-relaxed">
            Tôi đồng ý gửi clip này để hệ thống chấm form.{" "}
            <span className="text-[var(--color-text-muted)]">
              Clip bị xoá ngay sau khi chấm xong, kể cả khi chấm thất bại. Không ai xem clip — toàn
              bộ do máy phân tích.
            </span>
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          {files.map((file, i) => (
            <div key={file.name + i} className="flex items-end gap-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <div className="space-y-1">
                <Label htmlFor={`viewpoint-${i}`}>Góc quay</Label>
                <select
                  id={`viewpoint-${i}`}
                  value={viewpoints[i]}
                  onChange={(e) =>
                    setViewpoints((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                >
                  {VIEWPOINT_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {quotaExceeded && (
        <p className="mt-3 text-sm text-[var(--color-warn)]">
          Bạn đã dùng hết lượt chấm trong 7 ngày qua. Thử lại vào tuần sau.
        </p>
      )}
      {submit.isError && !quotaExceeded && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">{submit.error.message}</p>
      )}

      <div className="flex-1" />

      {files.length === 0 ? (
        <>
          <label className="mt-6 flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-base font-bold text-[var(--color-accent-fg)] hover:brightness-95">
            <input
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              onChange={(e) => pickFiles(e.target.files)}
            />
            Chọn clip vừa quay
          </label>
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
            Tối đa {MAX_CLIPS} clip, mỗi clip ≤ 30 giây. Trên điện thoại, nút này mở luôn camera.
          </p>
        </>
      ) : (
        <Button
          className="mt-6 w-full"
          disabled={!optIn || submit.isPending}
          onClick={() =>
            submit.mutate(
              { exerciseId: exerciseId!, files, viewpoints },
              { onSuccess: (review) => navigate(`/form-check/result/${review.id}`) },
            )
          }
        >
          {submit.isPending ? "Đang gửi…" : "Gửi clip để chấm"}
        </Button>
      )}
    </FlowScreen>
  )
}

/** Hướng dẫn riêng của bài nếu admin đã nhập, không thì dùng bộ mặc định. */
function guideSteps(guide: FilmingGuide | null): string[] {
  if (!guide) return DEFAULT_STEPS
  const steps = [
    ...(guide.angles ?? []).map((a) => `${a.label} — ${a.why}`),
    guide.distance,
    guide.lighting,
    guide.duration,
  ].filter((s): s is string => !!s)
  return steps.length > 0 ? steps : DEFAULT_STEPS
}
