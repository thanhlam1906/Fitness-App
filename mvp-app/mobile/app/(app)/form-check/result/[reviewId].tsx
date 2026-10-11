import { useEffect, type ReactNode } from "react"
import { Text, View } from "react-native"
import { useLocalSearchParams, useRouter, type Href } from "expo-router"
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"
import {
  CircleCheckBig,
  CloudOff,
  Dumbbell,
  EyeOff,
  Repeat,
  ScanLine,
  SwitchCamera,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native"
import { checkDetails, checkLabel, isOverallOk } from "@/features/review/utils/reviewView"
import type { Review } from "@/features/review/types"
import { cn } from "@/lib/cn"
import { formatDayMonth } from "@/lib/format"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"
import { Stepper } from "~/components/Stepper"
import { IconCircle, StatusBlock, type Tone } from "~/components/StatusViews"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { Skeleton } from "~/components/ui/Skeleton"
import { VerdictChip } from "~/features/review/components/VerdictChip"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { useReview } from "~/features/review/api/useReviews"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Màn 9 — kết quả chấm form, bản mobile của ReviewResultPage web: kết luận chung, MỘT lỗi quan trọng
 * nhất, từng mục kèm số dẫn chứng, và nút "góp ý này sai" ở mọi kết quả (bất biến). Đang phân tích
 * thì tự tải lại, không chặn màn. "Tập lại" về màn quay clip của bài (mobile không có màn camera).
 */
export default function ReviewResultScreen() {
  const router = useRouter()
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>()
  const review = useReview(reviewId)

  if (review.isLoading) {
    return <ResultSkeleton />
  }
  if (review.isError) {
    return (
      <Screen>
        <StatusBlock icon={CloudOff} tone="danger" title="Không tải được kết quả" detail={review.error.message} />
      </Screen>
    )
  }

  const data = review.data!
  const primary = data.checks.find((c) => c.isPrimary)
  const unknownExercise = data.status === "REJECTED" && data.rejectReason === "UNKNOWN_EXERCISE"
  const ok = isOverallOk(data.checks)
  const again: Href = data.exerciseId ? `/form-check/${data.exerciseId}` : "/form-check"

  return (
    <Screen>
      <BackLink label="Chấm form" fallback="/form-check" />
      <View className="mt-2.5">
        <Stepper label="Kiểm tra form" steps={3} current={2} />
      </View>
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
        <ResultCard
          icon={ScanLine}
          tone="warn"
          scanning
          title="Đang phân tích"
          detail="Kết quả tự hiện khi xong, không cần đợi ở đây."
        >
          <Button variant="secondary" onPress={() => router.dismissTo("/form-check")}>
            Quay lại
          </Button>
        </ResultCard>
      )}

      {unknownExercise && (
        <ResultCard icon={Dumbbell} title="Lần chấm này chưa có bài" detail="Chọn bài rồi tập lại.">
          <Button onPress={() => router.dismissTo("/form-check")}>Chọn bài</Button>
        </ResultCard>
      )}
      {data.status === "REJECTED" && !unknownExercise && (
        <RejectedCard review={data} onRetry={() => router.push(again)} />
      )}

      {data.status === "FAILED" && (
        <ResultCard icon={TriangleAlert} tone="danger" title="Chấm không thành công" detail={data.error}>
          <Button onPress={() => router.push(again)}>Thử lại</Button>
        </ResultCard>
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
                Lỗi quan trọng nhất
              </Text>
              <Text className="mt-2 text-[19px] font-bold leading-6 text-text">{checkLabel(primary)}</Text>
              <Text className="mt-2.5 text-sm leading-[22px] text-text">{primary.cueTextVi}</Text>
              {checkDetails(primary).map((line) => (
                <Text key={line} className="mt-1 text-xs text-text-muted" style={NUM}>
                  {line}
                </Text>
              ))}
              <View className="mt-3.5">
                <WrongFeedbackButton source={{ reviewResultId: primary.id }} hint="gửi cho HLV xem lại" />
              </View>
            </View>
          ) : (
            <ResultCard
              icon={CircleCheckBig}
              tone="success"
              title="Không có lỗi nào"
              detail="Giữ nguyên như vậy."
              className="mt-4"
            />
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
                  {checkDetails(check).map((line) => (
                    <Text key={line} className="mt-1 text-xs text-text-muted" style={NUM}>
                      {line}
                    </Text>
                  ))}
                  <View className="mt-2">
                    <WrongFeedbackButton source={{ reviewResultId: check.id }} />
                  </View>
                </View>
              ))}
          </View>

          <Text className="mt-4 text-[11px] leading-4 text-text-muted">
            Chấm theo ngưỡng huấn luyện viên đặt, dựa trên số đo góc khớp từ camera, có thể sai. Không phải đánh giá y
            tế. Clip đã bị xoá khỏi máy chủ, chỉ giữ số đo.
          </Text>
        </>
      )}

      {data.status === "DONE" && (
        <View className="mt-auto flex-row gap-2.5 pt-6">
          <Button variant="secondary" className="flex-1" onPress={() => router.push(again)}>
            Tập lại
          </Button>
          <Button className="flex-1" onPress={() => router.dismissTo("/schedule")}>
            Về lịch
          </Button>
        </View>
      )}
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
function RejectedCard({ review, onRetry }: { review: Review; onRetry: () => void }) {
  const REASONS: Record<string, { icon: LucideIcon; title: string }> = {
    BAD_VIEWPOINT: { icon: SwitchCamera, title: "Góc quay chưa dùng được cho bài này" },
    LOW_VISIBILITY: { icon: EyeOff, title: "Không nhìn rõ người trong khung hình" },
    NO_REPS: { icon: Repeat, title: "Không tách được rep nào" },
    UNREADABLE: { icon: TriangleAlert, title: "Không đọc được dữ liệu gửi lên" },
  }
  const reason = REASONS[review.rejectReason ?? ""] ?? { icon: TriangleAlert, title: "Dữ liệu gửi lên chưa dùng được" }
  return (
    <ResultCard icon={reason.icon} tone="warn" title={reason.title} detail={review.error}>
      <Button onPress={onRetry}>Xem lại hướng dẫn và thử lại</Button>
    </ResultCard>
  )
}

/** Thẻ trạng thái của lần chấm, biểu tượng ở đầu thẻ (doc/mockup-bieu-tuong kiểu 3). */
function ResultCard({
  icon,
  tone = "muted",
  scanning = false,
  title,
  detail,
  className = "mt-5",
  children,
}: {
  icon: LucideIcon
  tone?: Tone
  scanning?: boolean
  title: string
  detail?: string | null
  className?: string
  children?: ReactNode
}) {
  return (
    <Card className={cn("gap-3.5", className)}>
      <View className="flex-row items-center gap-3.5">
        <IconCircle icon={icon} tone={tone} size={46} iconSize={22}>
          {scanning && <ScanBeam />}
        </IconCircle>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-text">{title}</Text>
          {!!detail && <Text className="mt-0.5 text-[12.5px] text-text-muted">{detail}</Text>}
        </View>
      </View>
      {children}
    </Card>
  )
}

/** Vạch sáng quét lên xuống trong vòng biểu tượng "đang phân tích", như status-scan của web. */
function ScanBeam() {
  const y = useSharedValue(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    y.value = withRepeat(withTiming(1, { duration: 800 }), -1, true)
  }, [reduced, y])
  const style = useAnimatedStyle(() => ({ top: 8 + y.value * 28 }))
  if (reduced) return null
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 8,
          right: 8,
          height: 2,
          backgroundColor: colors.warn,
          shadowColor: colors.warn,
          shadowOpacity: 1,
          shadowRadius: 4,
        },
        style,
      ]}
    />
  )
}

/** Cùng khung với kết quả đã chấm: nút quay lại, stepper, tiêu đề, tên bài, nhãn kết luận, thẻ lỗi chính, các mục. */
function ResultSkeleton() {
  return (
    <Screen>
      <View accessible accessibilityLabel="Đang tải">
        <Skeleton className="h-4 w-20" />
        <View className="mt-2.5 flex-row justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </View>
        <Skeleton className="mt-2.5 h-1.5 w-full" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-1.5 h-3 w-48" />
        <Skeleton className="mt-4 h-11" />
        <Skeleton className="mt-5 h-8 w-32 rounded-full" />
        <Skeleton className="mt-4 h-40 rounded-xl" />
        <View className="mt-4 gap-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </View>
      </View>
    </Screen>
  )
}
