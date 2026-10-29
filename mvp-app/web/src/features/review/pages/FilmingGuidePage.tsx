import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Ban, CloudOff, TriangleAlert } from "lucide-react"
import { ApiError } from "@/api/client"
import { BackLink } from "@/components/BackLink"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { FlowScreen } from "@/components/UserShell"
import { IconText, Notice, StatusBlock } from "@/components/StatusViews"
import { cn } from "@/lib/cn"
import { Section } from "@/features/review/components/Section"
import { parseFilmingGuide } from "@/features/review/types"
import { clipSizeProblem, MAX_CLIP_MB, MAX_TOTAL_MB } from "@/features/review/utils/clipLimits"
import { angleNote, missingViews } from "@/features/review/utils/reviewView"
import { VIEW_NAME, type ViewCode } from "@/lib/formMeasures"
import { useExercise, useSubmitReview } from "@/features/review/api/useReviews"

const MAX_CLIPS = 3
const VIEW_CODES = Object.keys(VIEW_NAME) as ViewCode[]

/**
 * Câu dặn mặc định, thứ tự khoảng cách, ánh sáng, độ dài: ô nào admin bỏ trống thì điền câu của đúng ô đó.
 * Cách đặt máy nằm trong thẻ từng góc.
 */
const DEFAULT_TIPS = [
  "Cách 2–3 m, cả người trong khung suốt set.",
  "Ánh sáng từ phía trước, tránh ngược sáng.",
  "Quay 3–5 rep là đủ, tối đa 30 giây.",
]

/** Cách đặt máy cho từng góc, kèm ảnh minh hoạ ở public/form-check (người đứng thẳng, dùng chung mọi bài). */
const ANGLE_GUIDE: Record<ViewCode, { image: string; alt: string; steps: string[] }> = {
  SAGITTAL: {
    image: "/form-check/goc-ngang.jpg",
    alt: "Điện thoại đặt bên hông, máy thấy người tập nhìn nghiêng.",
    steps: ["Đặt máy bên hông, vuông góc với hướng mặt bạn.", "Ngang tầm hông, thấy cả người từ đầu tới bàn chân."],
  },
  FRONTAL: {
    image: "/form-check/goc-chinh-dien.jpg",
    alt: "Điện thoại đặt thẳng trước mặt, người tập quay mặt vào máy.",
    steps: ["Đặt máy thẳng trước mặt bạn.", "Ngang tầm hông, thấy rõ hai gối và hai bàn chân."],
  },
  DIAGONAL: {
    image: "/form-check/goc-cheo.jpg",
    alt: "Điện thoại đặt chéo 45 độ phía trước, máy thấy người tập xoay ba phần tư.",
    steps: ["Đặt máy chéo 45° phía trước, giữa thẳng mặt và bên hông.", "Ngang tầm hông, thấy cả người từ đầu tới bàn chân."],
  },
}

const BULLET = "flex gap-2 before:text-[var(--color-accent)] before:content-['•']"
// <label> bọc ô chọn file: ô thật ẩn (sr-only) nên viền focus vẽ trên nhãn.
const FILE_FOCUS =
  "cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]"

/**
 * Màn 8 concept-frontend-v1.md — hướng dẫn quay và gửi video.
 *
 * "Opt-in gửi clip nằm ở đây, không ở nơi khác": người dùng đọc điều gì sẽ xảy
 * ra với video NGAY CẠNH chỗ họ đồng ý, không phải trong một trang điều khoản.
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

  const name = exercise.data!.nameEn
  const guide = parseFilmingGuide(exercise.data!.filmingGuide)
  const tips = [guide?.distance, guide?.lighting, guide?.duration].map((s, i) => s?.trim() || DEFAULT_TIPS[i])
  const views = exercise.data!.checkViews
  const missing = files.length > 0 ? missingViews(views, viewpoints) : []
  const sizeProblem = clipSizeProblem(files.map((f) => f.size))
  const quotaExceeded = submit.error instanceof ApiError && submit.error.status === 429

  function pickFiles(fileList: FileList | null) {
    const picked = Array.from(fileList ?? []).slice(0, MAX_CLIPS)
    setFiles(picked)
    // Điền sẵn góc theo thứ tự thẻ hướng dẫn: quay đúng thứ tự thì không phải chỉnh ô nào.
    setViewpoints(picked.map((_, i) => views[i] ?? VIEW_CODES[0]))
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
      <BackLink to={`/form-check/${exerciseId}/live`}>Quay lại</BackLink>
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">{name}</h1>
      {views.length > 0 && (
        <p className="num mt-1.5 text-[13px] text-[var(--color-text-muted)]">
          Cần {views.length} video, mỗi góc một video.
        </p>
      )}

      {/* Mở từ link cũ tới bài chưa có khớp cần kiểm: chặn như màn camera, gửi lên cũng không chấm được. */}
      {views.length === 0 && (
        <Notice icon={Ban} tone="danger" className="mt-3">
          Bài này chưa chấm form được.
        </Notice>
      )}

      {/* Chỉ các góc bài này có khớp cần kiểm; thẻ đầu mở sẵn, các thẻ sau gập cho màn đỡ dài. */}
      <div className="mt-4 flex flex-col gap-2.5">
        {views.map((view, i) => {
          const angle = ANGLE_GUIDE[view]
          const note = angleNote(guide, view)
          return (
            <Section key={view} title={`Góc ${VIEW_NAME[view].toLowerCase()}`} meta={`video ${i + 1}`} open={i === 0}>
              <img src={angle.image} alt={angle.alt} className="block w-full rounded-[var(--radius-md)]" />
              <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-snug">
                {angle.steps.map((step) => (
                  <li key={step} className={BULLET}>
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

      <ul className="mt-3 flex flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-3.5 py-3 text-[13px] leading-snug text-[var(--color-text-muted)]">
        {tips.map((tip) => (
          <li key={tip} className={BULLET}>
            {tip}
          </li>
        ))}
      </ul>

      <label className="mt-3 flex cursor-pointer gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3.5 text-[13px] leading-relaxed">
        <Checkbox className="mt-0.5" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
        Đồng ý gửi video để máy chấm. Video bị xoá ngay sau khi chấm.
      </label>

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          {files.map((file, i) => (
            <div key={file.name + i} className="flex items-end gap-2.5">
              {/* Khung hình đầu video để nhận ra đây là góc nào — bấm để xem thử. */}
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
                {/* 16px: chữ nhỏ hơn thì iOS Safari phóng to cả trang khi chạm ô chọn. */}
                <select
                  id={`viewpoint-${i}`}
                  value={viewpoints[i]}
                  onChange={(e) =>
                    setViewpoints((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-base"
                >
                  {VIEW_CODES.map((code) => (
                    <option key={code} value={code}>
                      {VIEW_NAME[code]}
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
          Thiếu video góc {missing.map((v) => VIEW_NAME[v].toLowerCase()).join(", ")}. Chọn lại video hoặc đổi góc.
        </Notice>
      )}
      {/* Chặn trước khi gửi: quá cỡ thì máy chủ cắt giữa đường, người dùng chỉ thấy lỗi khó hiểu. */}
      {sizeProblem === "clip" && (
        <Notice icon={TriangleAlert} tone="warn" role="alert" className="mt-3">
          Có video quá {MAX_CLIP_MB} MB. Quay ngắn hơn rồi chọn lại.
        </Notice>
      )}
      {sizeProblem === "total" && (
        <Notice icon={TriangleAlert} tone="warn" role="alert" className="mt-3">
          Tổng các video quá {MAX_TOTAL_MB} MB. Quay ngắn hơn rồi chọn lại.
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
        <label className={buttonVariants({ className: cn("mt-6 w-full", FILE_FOCUS) })}>
          {fileInput}
          Chọn video
        </label>
      ) : (
        <div className="mt-6 flex gap-2.5">
          {/* Chọn thiếu hoặc nhầm video thì phải chọn lại được, không thì bị kẹt ở cảnh báo thiếu góc. */}
          <label className={buttonVariants({ variant: "secondary", className: cn("flex-1", FILE_FOCUS) })}>
            {fileInput}
            Chọn lại
          </label>
          <Button
            className="flex-1"
            disabled={!optIn || views.length === 0 || missing.length > 0 || sizeProblem !== null || submit.isPending}
            onClick={() =>
              submit.mutate(
                { exerciseId: exerciseId!, files, viewpoints },
                { onSuccess: (review) => navigate(`/form-check/result/${review.id}`) },
              )
            }
          >
            {submit.isPending ? "Đang gửi…" : "Gửi chấm"}
          </Button>
        </div>
      )}
    </FlowScreen>
  )
}

/** Cùng khung với màn: nút quay lại, tiêu đề, thẻ góc đầu mở sẵn có ảnh, thẻ gập, câu dặn, ô đồng ý, nút chọn video. */
function GuideSkeleton() {
  return (
    <FlowScreen>
      <div role="status" aria-label="Đang tải" className="flex flex-1 flex-col">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-1.5 h-4 w-48" />
        <Skeleton className="mt-4 h-80 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-2.5 h-14 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-3 h-24 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-3 h-14 rounded-[var(--radius-lg)]" />
        <div className="flex-1" />
        <Skeleton className="mt-6 h-[50px]" />
      </div>
    </FlowScreen>
  )
}
