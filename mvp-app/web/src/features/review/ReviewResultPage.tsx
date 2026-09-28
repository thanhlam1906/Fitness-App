import { useState } from "react"
import { Link, useParams } from "react-router"
import { ApiError } from "@/api/client"
import { Stepper } from "@/components/Stepper"
import { VerdictChip } from "@/components/VerdictChip"
import { WrongFeedbackButton } from "@/components/WrongFeedbackButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlowScreen } from "@/components/UserShell"
import { cn } from "@/lib/cn"
import { formatDayMonth } from "@/lib/format"
import { ExercisePickerSheet } from "./ExercisePickerSheet"
import { checkLabel, evidenceLine, evidenceOf, isOverallOk } from "./reviewView"
import type { Review } from "./types"
import { useChangeExercise, useReview } from "./useReviews"

/**
 * Màn 9 concept-frontend-v1.md, làm lại theo kiểu analyzer-demo (design-cham-form-llm-v1.md §3.3):
 * bài AI nhận diện + "Sai bài?", kết luận chung, MỘT lỗi quan trọng nhất, từng mục kèm số dẫn
 * chứng, và nút "góp ý này sai" ở mọi kết quả.
 *
 * §5.3: đang phân tích thì hiện `warn` + nút quay lại, KHÔNG chặn màn — người dùng đi làm việc
 * khác được, kết quả tự hiện khi xong.
 */
export function ReviewResultPage() {
  const { reviewId } = useParams<{ reviewId: string }>()
  const review = useReview(reviewId!)
  const change = useChangeExercise(reviewId!)
  const [picking, setPicking] = useState(false)

  if (review.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if (review.isError) {
    return <p className="text-sm text-[var(--color-danger)]">{review.error.message}</p>
  }

  const data = review.data!
  const primary = data.checks.find((c) => c.isPrimary)
  const unknownExercise = data.status === "REJECTED" && data.rejectReason === "UNKNOWN_EXERCISE"
  const ok = isOverallOk(data.checks)

  return (
    <FlowScreen>
      <Stepper label="Kiểm tra form" steps={3} current={2} />
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">Kết quả chấm form</h1>
      <p className="num mt-1 text-xs text-[var(--color-text-muted)]">{subtitle(data)}</p>

      {data.exerciseName && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3">
          <span className="text-sm">
            Bạn đã tập: <b>{data.exerciseName}</b>
          </span>
          {data.status === "DONE" && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              Sai bài?
            </button>
          )}
        </div>
      )}
      {change.isError && (
        <p className="mt-2 text-sm text-[var(--color-danger)]">
          {change.error instanceof ApiError && change.error.status === 409
            ? "Lần chấm này không chấm lại được."
            : change.error.message}
        </p>
      )}

      {(data.status === "PENDING" || data.status === "PROCESSING") && (
        <Card className="mt-5 space-y-3">
          <p className="text-sm text-[var(--color-warn)]">Đang phân tích. Việc này mất vài giây tới vài chục giây.</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Không cần đợi ở đây — kết quả tự hiện khi xong, và vẫn nằm trong danh sách "Lần gửi gần đây".
          </p>
          <Link to="/form-check">
            <Button variant="secondary">Quay lại</Button>
          </Link>
        </Card>
      )}

      {unknownExercise && (
        <Card className="mt-5 space-y-3">
          <p className="text-sm">Chưa nhận ra bài bạn tập. Chọn bài để chấm, không cần tập lại.</p>
          <Button onClick={() => setPicking(true)}>Chọn bài</Button>
        </Card>
      )}
      {data.status === "REJECTED" && !unknownExercise && <RejectedCard review={data} />}

      {data.status === "FAILED" && (
        <Card className="mt-5 space-y-3">
          <p className="text-sm text-[var(--color-danger)]">Chấm không thành công. {data.error}</p>
          <Link to="/form-check">
            <Button>Thử lại</Button>
          </Link>
        </Card>
      )}

      {data.status === "DONE" && (
        <>
          <div
            className={cn(
              "mt-5 inline-flex self-start rounded-full px-3 py-1.5 text-sm font-bold",
              ok
                ? "bg-[var(--color-success-tint)] text-[var(--color-success)]"
                : "bg-[var(--color-warn-tint)] text-[var(--color-warn)]",
            )}
          >
            {ok ? "Kỹ thuật ổn ✓" : "Cần cải thiện"}
          </div>

          {primary ? (
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--color-danger)] uppercase">
                Lỗi quan trọng nhất · AI đánh giá
              </div>
              <div className="mt-2 text-[19px] leading-tight font-bold">{checkLabel(primary)}</div>
              <p className="mt-2.5 text-sm leading-relaxed">{primary.cueTextVi}</p>
              {evidenceOf(primary).map((e, i) => (
                <p key={i} className="num mt-1 text-xs text-[var(--color-text-muted)]">
                  {evidenceLine(e)}
                </p>
              ))}
              <div className="mt-3.5">
                <WrongFeedbackButton source={{ reviewResultId: primary.id }} hint="gửi cho HLV xem lại" />
              </div>
            </div>
          ) : (
            <Card className="mt-4">
              <p className="text-sm text-[var(--color-success)]">
                Không có lỗi nào ở các mục chấm được. Giữ nguyên như vậy.
              </p>
            </Card>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {data.checks
              .filter((check) => !check.isPrimary)
              .map((check) => (
                <div key={check.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[15px] font-semibold">{checkLabel(check)}</span>
                    <VerdictChip verdict={check.verdict} />
                  </div>
                  {check.cueTextVi && (
                    <p className="mt-1 text-xs leading-snug text-[var(--color-text-muted)]">{check.cueTextVi}</p>
                  )}
                  {evidenceOf(check).map((e, i) => (
                    <p key={i} className="num mt-1 text-xs text-[var(--color-text-muted)]">
                      {evidenceLine(e)}
                    </p>
                  ))}
                  <div className="mt-2">
                    <WrongFeedbackButton source={{ reviewResultId: check.id }} />
                  </div>
                </div>
              ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            AI đánh giá dựa trên số đo góc khớp, chưa kiểm chứng, có thể sai. Không phải đánh giá y tế. Clip đã bị xoá
            khỏi máy chủ; chỉ giữ số đo góc khớp để chấm lại khi bạn sửa bài.
          </p>

          <div className="flex-1" />
          <div className="mt-6 flex gap-2.5">
            <Link to="/form-check/live" className="flex-1">
              <Button variant="secondary" className="w-full">
                Tập lại
              </Button>
            </Link>
            <Link to="/schedule" className="flex-1">
              <Button className="w-full">Về lịch</Button>
            </Link>
          </div>
        </>
      )}

      <ExercisePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        currentId={data.exerciseId}
        pending={change.isPending}
        // Đóng cả khi lỗi: câu báo lỗi nằm trên màn, khung trượt mở sẽ che mất.
        onPick={(exerciseId) => change.mutate(exerciseId, { onSettled: () => setPicking(false) })}
      />
    </FlowScreen>
  )
}

function subtitle(review: Review): string {
  const parts = [formatDayMonth(review.createdAt)]
  const clips = review.viewpoints.length
  if (clips > 0) parts.push(`${clips} góc quay`)
  if (review.finishedAt) {
    const seconds = Math.round((new Date(review.finishedAt).getTime() - new Date(review.createdAt).getTime()) / 1000)
    if (seconds >= 0) parts.push(`chấm xong sau ${seconds} giây`)
  }
  return parts.join(" · ")
}

/** §5.3 — bị từ chối phải nêu LÝ DO CỤ THỂ + đường thử lại, không phải "có lỗi xảy ra". */
function RejectedCard({ review }: { review: Review }) {
  const REASONS: Record<string, string> = {
    BAD_VIEWPOINT: "Góc quay chưa dùng được cho bài này.",
    LOW_VISIBILITY: "Không nhìn rõ người trong khung hình.",
    NO_REPS: "Không tách được rep nào.",
    UNREADABLE: "Không đọc được dữ liệu gửi lên.",
  }
  return (
    <Card className="mt-5 space-y-3">
      <p className="text-sm text-[var(--color-danger)]">
        {REASONS[review.rejectReason ?? ""] ?? "Dữ liệu gửi lên chưa dùng được."}
      </p>
      {review.error && <p className="text-sm text-[var(--color-text-muted)]">{review.error}</p>}
      {/* Về màn vào chứ không theo exerciseId: yêu cầu từ camera có thể chưa có bài. */}
      <Link to="/form-check">
        <Button>Xem lại hướng dẫn và thử lại</Button>
      </Link>
    </Card>
  )
}
