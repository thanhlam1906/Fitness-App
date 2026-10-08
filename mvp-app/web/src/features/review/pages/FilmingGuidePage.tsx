import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Ban, CloudOff, TriangleAlert } from "lucide-react"
import { ApiError } from "@/api/client"
import { Stepper } from "@/components/Stepper"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { FlowScreen } from "@/components/UserShell"
import { IconText, Notice, StatusBlock } from "@/components/StatusViews"
import { BackLink } from "@/features/review/components/BackLink"
import { Section } from "@/features/review/components/Section"
import { parseFilmingGuide, VIEWPOINT_OPTIONS } from "@/features/review/types"
import { angleNote, missingViews } from "@/features/review/utils/reviewView"
import { VIEW_NAME, type ViewCode } from "@/lib/formMeasures"
import { useExercise, useSubmitReview } from "@/features/review/api/useReviews"

const MAX_CLIPS = 3

/** Dặn chung khi bài chưa có `filming_guide`; cách đặt máy nằm trong thẻ từng góc. */
const DEFAULT_TIPS = [
  "Cách 2–3 m, cả người trong khung suốt set.",
  "Ánh sáng từ phía trước, tránh ngược sáng.",
  "Quay 3–5 rep là đủ, tối đa 30 giây.",
]

/** Cách đặt máy cho từng góc, kèm ảnh minh hoạ ở public/form-check (người đứng thẳng, dùng chung mọi bài). */
const ANGLE_GUIDE: Record<ViewCode, { title: string; image: string; alt: string; steps: string[] }> = {
  SAGITTAL: {
    title: "Góc ngang",
    image: "/form-check/goc-ngang.jpg",
    alt: "Điện thoại đặt bên hông, máy thấy người tập nhìn nghiêng.",
    steps: ["Đặt máy bên hông, vuông góc với hướng mặt bạn.", "Ngang tầm hông, thấy cả người từ đầu tới bàn chân."],
  },
  FRONTAL: {
    title: "Góc chính diện",
    image: "/form-check/goc-chinh-dien.jpg",
    alt: "Điện thoại đặt thẳng trước mặt, người tập quay mặt vào máy.",
    steps: ["Đặt máy thẳng trước mặt bạn.", "Ngang tầm hông, thấy rõ hai gối và hai bàn chân."],
  },
  DIAGONAL: {
    title: "Góc chéo 45°",
    image: "/form-check/goc-cheo.jpg",
    alt: "Điện thoại đặt chéo 45 độ phía trước, máy thấy người tập xoay ba phần tư.",
    steps: ["Đặt máy chéo 45° phía trước, giữa thẳng mặt và bên hông.", "Ngang tầm hông, thấy cả người từ đầu tới bàn chân."],
  },
}

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

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  if (exercise.isLoading) {
    return <GuideSkeleton />
  }
  if (exercise.isError) {
    return <StatusBlock icon={CloudOff} tone="danger" title="Không tải được bài tập" detail={exercise.error.message} />
  }

  const name = exercise.data!.nameVi ?? exercise.data!.nameEn
  const guide = parseFilmingGuide(exercise.data!.filmingGuide)
  const tips = [guide?.distance, guide?.lighting, guide?.duration].filter((s): s is string => !!s)
  const views = exercise.data!.checkViews
  const missing = files.length > 0 ? missingViews(views, viewpoints) : []
  const quotaExceeded = submit.error instanceof ApiError && submit.error.status === 429

  function pickFiles(fileList: FileList | null) {
    const picked = Array.from(fileList ?? []).slice(0, MAX_CLIPS)
    setFiles(picked)
    // Điền sẵn góc theo thứ tự thẻ hướng dẫn: quay đúng thứ tự thì không phải chỉnh ô nào.
    setViewpoints(picked.map((_, i) => views[i] ?? VIEWPOINT_OPTIONS[0].value))
  }

  const fileInput = (
    <input
      type="file"
      accept="video/*"
      multiple
      className="sr-only"
      onChange={(e) => {
        pickFiles(e.target.files)
        e.target.value = "" // chọn lại đúng các file cũ vẫn phải gọi onChange
      }}
    />
  )

  return (
    <FlowScreen>
      <BackLink to={`/form-check/${exerciseId}/live`}>← Quay lại</BackLink>
      <div className="mt-2.5">
        <Stepper label="Kiểm tra form" steps={3} current={1} />
      </div>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Quay một set {name}</h1>
      <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">Quay mỗi góc một clip.</p>

      {/* Mở từ link cũ tới bài chưa có khớp cần kiểm: chặn như màn camera, gửi lên cũng không chấm được. */}
      {views.length === 0 && (
        <Notice icon={Ban} tone="danger" className="mt-3">
          Bài này chưa chấm form được.
        </Notice>
      )}

      {/* Chỉ các góc bài này có khớp cần kiểm; thẻ đầu mở sẵn, các thẻ sau gập cho màn đỡ dài. */}
      <div className="mt-4 flex flex-col gap-2.5">
        {exercise.data!.checkViews.map((view, i) => {
          const angle = ANGLE_GUIDE[view]
          const note = angleNote(guide, view)
          return (
            <Section key={view} title={angle.title} meta={`clip ${i + 1}`} open={i === 0}>
              <img src={angle.image} alt={angle.alt} className="block w-full rounded-[var(--radius-md)]" />
              <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-snug">
                {angle.steps.map((step) => (
                  <li key={step} className="flex gap-2 before:text-[var(--color-accent)] before:content-['•']">
                    {step}
                  </li>
                ))}
              </ul>
              {note && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)] first-letter:uppercase">{note}</p>
              )}
            </Section>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {(tips.length > 0 ? tips : DEFAULT_TIPS).map((tip) => (
          <li
            key={tip}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] leading-snug text-[var(--color-text-muted)]"
          >
            {tip}
          </li>
        ))}
      </ul>

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
              {/* Khung hình đầu clip để nhận ra đây là góc nào — bấm để xem thử. */}
              <video
                src={`${previews[i]}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                className="h-20 w-16 shrink-0 rounded-[var(--radius-md)] bg-black object-cover"
                onClick={(e) =>
                  e.currentTarget.paused ? void e.currentTarget.play() : e.currentTarget.pause()
                }
              />
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

      {missing.length > 0 && (
        <Notice icon={TriangleAlert} tone="warn" role="alert" className="mt-3">
          Bài này cần đủ góc {views.map((v) => VIEW_NAME[v]).join(", ")}. Còn thiếu clip góc{" "}
          {missing.map((v) => VIEW_NAME[v]).join(", ")}: chọn lại clip hoặc đổi ô Góc quay.
        </Notice>
      )}
      {quotaExceeded && (
        <IconText tone="warn" className="mt-3">
          Bạn đã dùng hết lượt chấm trong 7 ngày qua. Thử lại vào tuần sau.
        </IconText>
      )}
      {submit.isError && !quotaExceeded && (
        <IconText className="mt-3">{submit.error.message}</IconText>
      )}

      <div className="flex-1" />

      {files.length === 0 ? (
        <>
          <label className="mt-6 flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-base font-bold text-[var(--color-accent-fg)] hover:brightness-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]">
            {fileInput}
            Chọn clip vừa quay
          </label>
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
            Cần {views.length} clip, mỗi góc một clip, mỗi clip ≤ 30 giây. Trên điện thoại, nút này mở luôn
            camera.
          </p>
        </>
      ) : (
        <div className="mt-6 flex gap-2.5">
          {/* Chọn thiếu hoặc nhầm clip thì phải chọn lại được, không thì bị kẹt ở cảnh báo thiếu góc. */}
          <label className="flex min-h-[52px] flex-1 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[15px] font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]">
            {fileInput}
            Chọn lại clip
          </label>
          <Button
            className="flex-1"
            disabled={!optIn || views.length === 0 || missing.length > 0 || submit.isPending}
            onClick={() =>
              submit.mutate(
                { exerciseId: exerciseId!, files, viewpoints },
                { onSuccess: (review) => navigate(`/form-check/result/${review.id}`) },
              )
            }
          >
            {submit.isPending ? "Đang gửi…" : "Gửi clip để chấm"}
          </Button>
        </div>
      )}
    </FlowScreen>
  )
}

/** Cùng khung với màn: nút quay lại, stepper, tiêu đề, thẻ góc đầu mở sẵn có ảnh, thẻ gập, ô đồng ý, nút chọn clip. */
function GuideSkeleton() {
  return (
    <FlowScreen>
      <div role="status" aria-label="Đang tải" className="flex flex-1 flex-col">
        <Skeleton className="h-4 w-20" />
        <div className="mt-2.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="mt-2.5 h-1.5 w-full" />
        </div>
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-1.5 h-4 w-36" />
        <Skeleton className="mt-4 h-80 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-2.5 h-14 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-3 h-11" />
        <Skeleton className="mt-4 h-24 rounded-xl" />
        <div className="flex-1" />
        <Skeleton className="mt-6 h-[52px]" />
      </div>
    </FlowScreen>
  )
}
