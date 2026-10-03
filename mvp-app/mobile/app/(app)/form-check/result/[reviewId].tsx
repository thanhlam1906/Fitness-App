import { Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { checkLabel, evidenceLine, evidenceOf, isOverallOk } from "@/features/review/utils/reviewView"
import type { Review } from "@/features/review/types"
import { cn } from "@/lib/cn"
import { formatDayMonth } from "@/lib/format"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { VerdictChip } from "~/features/review/components/VerdictChip"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { useReview } from "~/features/review/api/useReviews"

const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Màn 9 — kết quả chấm form, bản mobile CHỈ XEM của ReviewResultPage web: kết luận chung, MỘT lỗi
 * quan trọng nhất, từng mục kèm số dẫn chứng, và nút "góp ý này sai" ở mọi kết quả (bất biến).
 * "Sai bài?" và chấm lại vẫn ở bản web (doc/design-mobile-v1.md §8). Đang phân tích thì tự tải lại.
 */
export default function ReviewResultScreen() {
  const router = useRouter()
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>()
  const review = useReview(reviewId)

  if (review.isLoading) {
    return (
      <Screen>
        <Text className="text-sm text-text-muted">Đang tải…</Text>
      </Screen>
    )
  }
  if (review.isError) {
    return (
      <Screen>
        <Text className="text-sm text-danger">{review.error.message}</Text>
      </Screen>
    )
  }

  const data = review.data!
  const primary = data.checks.find((c) => c.isPrimary)
  const unknownExercise = data.status === "REJECTED" && data.rejectReason === "UNKNOWN_EXERCISE"
  const ok = isOverallOk(data.checks)

  return (
    <Screen>
      <BackLink label="Chấm form" fallback="/form-check" />
      <Text className="mt-3 text-[26px] font-extrabold tracking-[-0.5px] text-text">Kết quả chấm form</Text>
      <Text className="mt-1 text-xs text-text-muted" style={NUM}>
        {subtitle(data)}
      </Text>

      {data.exerciseName && (
        <View className="mt-4 rounded-md bg-surface px-3.5 py-3">
          <Text className="text-sm text-text">
            Bạn đã tập: <Text className="font-bold">{data.exerciseName}</Text>
          </Text>
        </View>
      )}

      {(data.status === "PENDING" || data.status === "PROCESSING") && (
        <Card className="mt-5 gap-3">
          <Text className="text-sm text-warn">Đang phân tích. Việc này mất vài giây tới vài chục giây.</Text>
          <Text className="text-sm text-text-muted">
            Không cần đợi ở đây — kết quả tự hiện khi xong, và vẫn nằm trong danh sách "Lần gửi gần đây".
          </Text>
        </Card>
      )}

      {unknownExercise && (
        <Card className="mt-5">
          {/* Chọn bài để chấm lại từ số đo đã lưu là việc của bản web ở v1. */}
          <Text className="text-sm text-text">Chưa nhận ra bài bạn tập. Mở bản web để chọn bài, không cần tập lại.</Text>
        </Card>
      )}
      {data.status === "REJECTED" && !unknownExercise && <RejectedCard review={data} />}

      {data.status === "FAILED" && (
        <Card className="mt-5">
          <Text className="text-sm text-danger">Chấm không thành công. {data.error}</Text>
        </Card>
      )}

      {data.status === "DONE" && (
        <>
          <View className={cn("mt-5 self-start rounded-full px-3 py-1.5", ok ? "bg-success-tint" : "bg-warn-tint")}>
            <Text className={cn("text-sm font-bold", ok ? "text-success" : "text-warn")}>
              {ok ? "Kỹ thuật ổn ✓" : "Cần cải thiện"}
            </Text>
          </View>

          {primary ? (
            <View className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
              <Text className="text-[11px] font-bold uppercase tracking-[1.1px] text-danger">
                Lỗi quan trọng nhất · AI đánh giá
              </Text>
              <Text className="mt-2 text-[19px] font-bold leading-6 text-text">{checkLabel(primary)}</Text>
              <Text className="mt-2.5 text-sm leading-[22px] text-text">{primary.cueTextVi}</Text>
              {evidenceOf(primary).map((e, i) => (
                <Text key={i} className="mt-1 text-xs text-text-muted" style={NUM}>
                  {evidenceLine(e)}
                </Text>
              ))}
              <View className="mt-3.5">
                <WrongFeedbackButton source={{ reviewResultId: primary.id }} hint="gửi cho HLV xem lại" />
              </View>
            </View>
          ) : (
            <Card className="mt-4">
              <Text className="text-sm text-success">Không có lỗi nào ở các mục chấm được. Giữ nguyên như vậy.</Text>
            </Card>
          )}

          <View className="mt-4 gap-2">
            {data.checks
              .filter((check) => !check.isPrimary)
              .map((check) => (
                <View key={check.id} className="rounded-md bg-surface p-3.5">
                  <View className="flex-row items-center justify-between gap-2.5">
                    <Text className="flex-1 text-[15px] font-semibold text-text">{checkLabel(check)}</Text>
                    <VerdictChip verdict={check.verdict} />
                  </View>
                  {check.cueTextVi && <Text className="mt-1 text-xs leading-4 text-text-muted">{check.cueTextVi}</Text>}
                  {evidenceOf(check).map((e, i) => (
                    <Text key={i} className="mt-1 text-xs text-text-muted" style={NUM}>
                      {evidenceLine(e)}
                    </Text>
                  ))}
                  <View className="mt-2">
                    <WrongFeedbackButton source={{ reviewResultId: check.id }} />
                  </View>
                </View>
              ))}
          </View>

          <Text className="mt-4 text-[11px] leading-4 text-text-muted">
            AI đánh giá dựa trên số đo góc khớp, chưa kiểm chứng, có thể sai. Không phải đánh giá y tế. Clip đã bị xoá
            khỏi máy chủ; chỉ giữ số đo góc khớp để chấm lại khi bạn sửa bài.
          </Text>
        </>
      )}

      <Button className="mt-auto w-full" onPress={() => router.dismissTo("/schedule")}>
        Về lịch
      </Button>
    </Screen>
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
    <Card className="mt-5 gap-3">
      <Text className="text-sm text-danger">{REASONS[review.rejectReason ?? ""] ?? "Dữ liệu gửi lên chưa dùng được."}</Text>
      {review.error && <Text className="text-sm text-text-muted">{review.error}</Text>}
      <Text className="text-sm text-text-muted">Xem lại hướng dẫn quay và thử lại trên bản web.</Text>
    </Card>
  )
}
