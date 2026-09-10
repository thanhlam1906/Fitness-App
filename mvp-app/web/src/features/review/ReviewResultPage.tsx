import { Link, useParams } from "react-router"
import { Stepper } from "@/components/Stepper"
import { VerdictChip } from "@/components/VerdictChip"
import { WrongFeedbackButton } from "@/components/WrongFeedbackButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlowScreen } from "@/components/UserShell"
import { formatDayMonth } from "@/lib/format"
import type { Review } from "./types"
import { useReview } from "./useReviews"

/**
 * Màn 9 concept-frontend-v1.md — từng check đạt/không đạt/chưa đủ tin cậy, MỘT
 * lỗi quan trọng nhất kèm cách sửa, và nút "góp ý này sai" ở mọi kết quả.
 *
 * §5.3: clip đang phân tích thì hiện `warn` + nút quay lại, KHÔNG chặn màn —
 * người dùng đi làm việc khác được, kết quả tự hiện khi xong.
 */
export function ReviewResultPage() {
  const { reviewId } = useParams<{ reviewId: string }>()
  const review = useReview(reviewId!)

  if (review.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }
  if (review.isError) {
    return <p className="text-sm text-[var(--color-danger)]">{review.error.message}</p>
  }

  const data = review.data!
  const primary = data.checks.find((c) => c.isPrimary)

  return (
    <FlowScreen>
      <Stepper label="Kiểm tra form" steps={3} current={2} />
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">
        {data.exerciseName ?? "Kết quả chấm form"}, {formatDayMonth(data.createdAt)}
      </h1>
      <p className="num mt-1 text-xs text-[var(--color-text-muted)]">{subtitle(data)}</p>

      {(data.status === "PENDING" || data.status === "PROCESSING") && (
        <Card className="mt-5 space-y-3">
          <p className="text-sm text-[var(--color-warn)]">
            Đang phân tích clip. Việc này mất vài giây tới vài chục giây.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Không cần đợi ở đây — kết quả tự hiện khi xong, và vẫn nằm trong danh sách "Lần gửi gần
            đây".
          </p>
          <Link to="/form-check">
            <Button variant="secondary">Quay lại</Button>
          </Link>
        </Card>
      )}

      {data.status === "REJECTED" && <RejectedCard review={data} />}

      {data.status === "FAILED" && (
        <Card className="mt-5 space-y-3">
          <p className="text-sm text-[var(--color-danger)]">Chấm không thành công. {data.error}</p>
          <Link to={`/form-check/${data.exerciseId}`}>
            <Button>Gửi lại clip</Button>
          </Link>
        </Card>
      )}

      {data.status === "DONE" && (
        <>
          <div className="mt-5 flex flex-col gap-2">
            {data.checks.map((check) => (
              <div key={check.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[15px] font-semibold">{check.code ?? "—"}</span>
                  <VerdictChip verdict={check.verdict} />
                </div>
                {check.cueTextVi && (
                  <p className="mt-1 text-xs leading-snug text-[var(--color-text-muted)]">
                    {check.cueTextVi}
                  </p>
                )}
                {check.confidence != null && (
                  <p className="num mt-1 text-xs text-[var(--color-text-muted)]">
                    độ tin cậy {check.confidence}
                  </p>
                )}
                {!check.isPrimary && (
                  <div className="mt-2">
                    <WrongFeedbackButton source={{ reviewResultId: check.id }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {primary ? (
            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <div className="text-[11px] font-bold tracking-[0.1em] text-[var(--color-danger)] uppercase">
                Lỗi quan trọng nhất
              </div>
              <div className="mt-2 text-[19px] leading-tight font-bold">{primary.code ?? "—"}</div>
              <p className="mt-2.5 text-sm leading-relaxed">{primary.cueTextVi}</p>
              <div className="mt-3.5">
                <WrongFeedbackButton
                  source={{ reviewResultId: primary.id }}
                  hint="gửi cho HLV xem lại"
                />
              </div>
            </div>
          ) : (
            <Card className="mt-5">
              <p className="text-sm text-[var(--color-success)]">
                Không có lỗi nào vượt ngưỡng ở các check chấm được. Giữ nguyên như vậy.
              </p>
            </Card>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Kết quả do máy chấm theo ngưỡng đã đặt trước, có thể sai. Đây không phải đánh giá y tế.
            Clip đã bị xoá khỏi máy chủ.
          </p>

          <div className="flex-1" />
          <div className="mt-6 flex gap-2.5">
            <Link to={`/form-check/${data.exerciseId}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Quay clip khác
              </Button>
            </Link>
            <Link to="/schedule" className="flex-1">
              <Button className="w-full">Về lịch tuần</Button>
            </Link>
          </div>
        </>
      )}
    </FlowScreen>
  )
}

function subtitle(review: Review): string {
  const clips = review.viewpoints.length
  const parts = [clips > 0 ? `${clips} clip` : null]
  if (review.finishedAt) {
    const seconds = Math.round(
      (new Date(review.finishedAt).getTime() - new Date(review.createdAt).getTime()) / 1000,
    )
    if (seconds >= 0) parts.push(`chấm xong sau ${seconds} giây`)
  }
  return parts.filter(Boolean).join(" · ")
}

/** §5.3 — clip bị từ chối phải nêu LÝ DO CỤ THỂ + link về hướng dẫn quay, không phải "có lỗi xảy ra". */
function RejectedCard({ review }: { review: Review }) {
  const REASONS: Record<string, string> = {
    BAD_VIEWPOINT: "Góc quay chưa dùng được cho bài này.",
    LOW_VISIBILITY: "Không nhìn rõ người trong khung hình.",
    NO_REPS: "Không tách được rep nào từ clip.",
    UNREADABLE: "Không đọc được nội dung video.",
  }
  return (
    <Card className="mt-5 space-y-3">
      <p className="text-sm text-[var(--color-danger)]">
        {REASONS[review.rejectReason ?? ""] ?? "Clip chưa dùng được."}
      </p>
      {review.error && <p className="text-sm text-[var(--color-text-muted)]">{review.error}</p>}
      <Link to={`/form-check/${review.exerciseId}`}>
        <Button>Xem lại hướng dẫn quay và gửi lại</Button>
      </Link>
    </Card>
  )
}
