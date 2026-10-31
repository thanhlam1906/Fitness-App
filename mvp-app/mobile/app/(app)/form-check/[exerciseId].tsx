import { useState } from "react"
import { Image, Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { Ban, CloudOff, Film, TriangleAlert, X } from "lucide-react-native"
import { parseFilmingGuide } from "@/features/review/types"
import { clipSizeProblem, MAX_CLIP_MB, MAX_TOTAL_MB } from "@/features/review/utils/clipLimits"
import { angleNote, missingViews } from "@/features/review/utils/reviewView"
import { VIEW_NAME, type ViewCode } from "@/lib/formMeasures"
import { cn } from "@/lib/cn"
import { ApiError } from "~/api/client"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"
import { IconText, Notice, StatusBlock } from "~/components/StatusViews"
import { Button } from "~/components/ui/Button"
import { Checkbox } from "~/components/ui/Checkbox"
import { Skeleton } from "~/components/ui/Skeleton"
import { Section } from "~/features/review/components/Section"
import { useExercise, useSubmitReview, type Clip } from "~/features/review/api/useReviews"
import { assetUrl } from "~/lib/config"
import { colors } from "~/theme"

const MAX_CLIPS = 3
const VIEW_CODES = Object.keys(VIEW_NAME) as ViewCode[]
const MAX_SECONDS = 30
// Video chọn từ thư viện: luôn chuyển sang H.264 1080p, vì video iPhone mặc định HEVC/4K vừa nặng vừa
// có thể vượt MAX_CLIP_MB; Passthrough (mặc định) chép nguyên file gốc. iOS bỏ qua preset này khi quay mới,
// nên camera hạ cỡ bằng videoQuality: 720p đủ cho nhận dạng tư thế và 30 giây vẫn dưới MAX_CLIP_MB.
const LIBRARY_EXPORT = ImagePicker.VideoExportPreset.H264_1920x1080
const CAMERA_QUALITY = ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720

/**
 * Câu dặn mặc định, thứ tự khoảng cách, ánh sáng, độ dài: ô nào admin bỏ trống thì điền câu của đúng ô đó.
 * Cách đặt máy nằm trong thẻ từng góc.
 */
const DEFAULT_TIPS = [
  "Cách 2–3 m, cả người trong khung suốt set.",
  "Ánh sáng từ phía trước, tránh ngược sáng.",
  "Quay 3–5 rep là đủ, tối đa 30 giây.",
]

/** Cách đặt máy cho từng góc, ảnh minh hoạ lấy từ web/public/form-check. */
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

type PickedClip = Clip & { seconds: number | null; bytes: number | null }

/**
 * Màn 8 concept-frontend-v1.md — bản mobile của FilmingGuidePage web: hướng dẫn quay từng góc và gửi
 * video. Khác web: không có màn camera nhận dạng trực tiếp (cần thư viện native ngoài Expo Go, người
 * dùng chốt 10-09), nên đây là lối chấm duy nhất của mobile; "Quay video" mở camera quay từng góc một,
 * "Chọn video có sẵn" lấy từ thư viện ảnh.
 *
 * "Opt-in gửi clip nằm ở đây, không ở nơi khác": người dùng đọc điều gì sẽ xảy ra với video NGAY CẠNH
 * chỗ họ đồng ý, không phải trong một trang điều khoản.
 */
export default function FilmingGuideScreen() {
  const router = useRouter()
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>()
  const exercise = useExercise(exerciseId)
  const submit = useSubmitReview()

  const [clips, setClips] = useState<PickedClip[]>([])
  const [viewpoints, setViewpoints] = useState<string[]>([])
  const [optIn, setOptIn] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)

  if (exercise.isLoading) {
    return <GuideSkeleton />
  }
  if (exercise.isError) {
    return (
      <Screen>
        <StatusBlock icon={CloudOff} tone="danger" title="Không tải được bài tập" detail={exercise.error.message} />
      </Screen>
    )
  }

  const data = exercise.data!
  const name = data.nameEn
  const guide = parseFilmingGuide(data.filmingGuide)
  const tips = [guide?.distance, guide?.lighting, guide?.duration].map((s, i) => s?.trim() || DEFAULT_TIPS[i])
  const views = data.checkViews
  const missing = clips.length > 0 ? missingViews(views, viewpoints) : []
  const tooLong = clips.some((c) => c.seconds !== null && c.seconds > MAX_SECONDS)
  // Quá cỡ thì máy chủ (hoặc Cloudflare, trên 100 MB) cắt kết nối, người dùng chỉ đọc được câu mất mạng sai lý do.
  const sizeProblem = clipSizeProblem(clips.map((c) => c.bytes))
  const quotaExceeded = submit.error instanceof ApiError && submit.error.status === 429

  /** Thêm video vào cuối, ô góc điền sẵn theo thứ tự thẻ hướng dẫn: quay đúng thứ tự thì không phải chỉnh. */
  function addClips(assets: ImagePicker.ImagePickerAsset[]) {
    const room = MAX_CLIPS - clips.length
    const added = assets.slice(0, room).map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `clip-${clips.length + i + 1}.mov`,
      type: a.mimeType ?? "video/quicktime",
      seconds: a.duration == null ? null : Math.round(a.duration / 1000),
      bytes: a.fileSize ?? null,
    }))
    setClips((prev) => [...prev, ...added])
    // Góc còn thiếu trước: bỏ một video quay hỏng rồi quay lại thì video mới nhận đúng góc vừa trống.
    setViewpoints((prev) => {
      const free = missingViews(views, prev)
      return [...prev, ...added.map((_, i) => free[i] ?? VIEW_CODES[0])]
    })
  }

  async function record() {
    setPickError(null)
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setPickError("Chưa có quyền dùng camera. Bật trong Cài đặt của iPhone, hoặc chọn video có sẵn.")
      return
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: MAX_SECONDS,
        videoQuality: CAMERA_QUALITY,
      })
      if (!result.canceled) addClips(result.assets)
    } catch {
      setPickError("Không mở được camera. Thử lại, hoặc chọn video có sẵn.")
    }
  }

  async function pickFromLibrary() {
    setPickError(null)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: true,
        // Trả về đúng thứ tự người dùng chọn: góc điền sẵn theo thứ tự đó, không có ảnh xem trước để soát.
        orderedSelection: true,
        selectionLimit: MAX_CLIPS - clips.length,
        videoExportPreset: LIBRARY_EXPORT,
      })
      if (!result.canceled) addClips(result.assets)
    } catch {
      setPickError("Không mở được video này. Thử chọn video khác hoặc quay mới.")
    }
  }

  function removeClip(index: number) {
    setClips((prev) => prev.filter((_, i) => i !== index))
    setViewpoints((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Screen>
      <BackLink label="Quay lại" fallback="/form-check" />
      <Text className="mt-3 text-[28px] font-extrabold leading-[35px] tracking-[-0.5px] text-text">{name}</Text>
      {views.length > 0 && (
        <Text className="mt-1.5 text-[13px] text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          Cần {views.length} video, mỗi góc một video.
        </Text>
      )}

      {/* Mở từ link cũ tới bài chưa có khớp cần kiểm: gửi lên cũng không chấm được. */}
      {views.length === 0 && (
        <Notice icon={Ban} tone="danger" className="mt-3">
          Bài này chưa chấm form được.
        </Notice>
      )}

      {/* Chỉ các góc bài này có khớp cần kiểm; thẻ đầu mở sẵn, các thẻ sau gập cho màn đỡ dài. */}
      <View className="mt-4 gap-2.5">
        {views.map((view, i) => {
          const angle = ANGLE_GUIDE[view]
          const note = angleNote(guide, view)
          return (
            <Section key={view} title={`Góc ${VIEW_NAME[view].toLowerCase()}`} meta={`video ${i + 1}`} open={i === 0}>
              <Image
                source={{ uri: assetUrl(angle.image) }}
                accessibilityLabel={angle.alt}
                className="w-full rounded-md"
                // Đúng tỉ lệ ảnh gốc 1024×545: cắt bớt là mất chỗ đặt điện thoại ở mép ảnh.
                style={{ aspectRatio: 1024 / 545 }}
                resizeMode="cover"
              />
              <View className="mt-2.5 gap-1.5">
                {angle.steps.map((step) => (
                  <View key={step} className="flex-row gap-2">
                    <Text className="text-[13px] text-accent">•</Text>
                    <Text className="flex-1 text-[13px] leading-[18px] text-text">{step}</Text>
                  </View>
                ))}
              </View>
              {note && <Text className="mt-2 text-xs text-text-muted">{note.charAt(0).toUpperCase() + note.slice(1)}</Text>}
            </Section>
          )
        })}
      </View>

      <View className="mt-3 gap-1.5 rounded-lg bg-surface px-3.5 py-3">
        {tips.map((tip) => (
          <View key={tip} className="flex-row gap-2">
            <Text className="text-[13px] text-accent">•</Text>
            <Text className="flex-1 text-[13px] leading-[18px] text-text-muted">{tip}</Text>
          </View>
        ))}
      </View>

      <View className="mt-3 rounded-lg bg-surface p-3.5">
        <Checkbox checked={optIn} onChange={setOptIn}>
          <Text className="flex-1 text-[13px] leading-5 text-text">
            Đồng ý gửi video để máy chấm. Video bị xoá ngay sau khi chấm.
          </Text>
        </Checkbox>
      </View>

      {clips.length > 0 && (
        <View className="mt-4 gap-2.5">
          {/* Khác web: không có khung hình đầu video, vì lấy ảnh từ video cần thêm thư viện. Tên góc
              điền sẵn theo thứ tự quay/chọn, người dùng đổi ở ô Góc quay nếu lệch. */}
          {clips.map((clip, i) => (
            <View key={clip.uri} className="rounded-md bg-surface p-3">
              <View className="flex-row items-center gap-2.5">
                <Film size={18} color={colors["text-muted"]} />
                <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                  Video {i + 1}
                  {clip.seconds !== null && <Text className="text-text-muted"> · {clip.seconds} giây</Text>}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ video ${i + 1}`} hitSlop={12} onPress={() => removeClip(i)}>
                  <X size={18} color={colors["text-muted"]} />
                </Pressable>
              </View>
              <Text className="mb-1.5 mt-2.5 text-xs text-text-muted">Góc quay</Text>
              <View accessibilityRole="radiogroup" className="flex-row gap-1.5">
                {VIEW_CODES.map((code) => {
                  const on = viewpoints[i] === code
                  return (
                    <Pressable
                      key={code}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setViewpoints((prev) => prev.map((p, j) => (j === i ? code : p)))}
                      className={cn("h-11 flex-1 items-center justify-center rounded-md", on ? "border border-accent bg-accent-tint" : "bg-surface-2")}
                    >
                      <Text className={cn("text-[13px]", on ? "font-semibold text-accent" : "text-text-muted")}>{VIEW_NAME[code]}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {missing.length > 0 && (
        <Notice icon={TriangleAlert} tone="warn" alert className="mt-3">
          Thiếu video góc {missing.map((v) => VIEW_NAME[v].toLowerCase()).join(", ")}. Thêm video hoặc đổi góc.
        </Notice>
      )}
      {tooLong && (
        <Notice icon={TriangleAlert} tone="warn" alert className="mt-3">
          Có video quá {MAX_SECONDS} giây. Bỏ video đó rồi quay ngắn hơn.
        </Notice>
      )}
      {sizeProblem === "clip" && (
        <Notice icon={TriangleAlert} tone="warn" alert className="mt-3">
          Có video quá {MAX_CLIP_MB} MB. Bỏ video đó rồi quay ngắn hơn.
        </Notice>
      )}
      {sizeProblem === "total" && (
        <Notice icon={TriangleAlert} tone="warn" alert className="mt-3">
          Tổng các video quá {MAX_TOTAL_MB} MB. Bỏ bớt video hoặc quay ngắn hơn.
        </Notice>
      )}
      {pickError && <IconText className="mt-3">{pickError}</IconText>}
      {quotaExceeded && (
        <IconText tone="warn" className="mt-3">
          Bạn đã dùng hết lượt chấm trong 7 ngày qua. Thử lại vào tuần sau.
        </IconText>
      )}
      {submit.isError && !quotaExceeded && <IconText className="mt-3">{submit.error.message}</IconText>}

      <View className="mt-auto pt-6">
        {clips.length < MAX_CLIPS && (
          <View className="flex-row gap-2.5">
            <Button variant={clips.length === 0 ? "primary" : "secondary"} className="flex-1" onPress={record}>
              Quay video
            </Button>
            <Button variant="secondary" className="flex-1" onPress={pickFromLibrary}>
              Chọn video có sẵn
            </Button>
          </View>
        )}
        {clips.length > 0 && (
          <Button
            className="mt-2.5 w-full"
            disabled={!optIn || views.length === 0 || missing.length > 0 || tooLong || sizeProblem !== null || submit.isPending}
            onPress={() =>
              submit.mutate(
                { exerciseId, clips: clips.map(({ uri, name, type }) => ({ uri, name, type })), viewpoints },
                { onSuccess: (review) => router.replace(`/form-check/result/${review.id}`) },
              )
            }
          >
            {submit.isPending ? "Đang gửi…" : "Gửi chấm"}
          </Button>
        )}
      </View>
    </Screen>
  )
}

/** Cùng khung với màn: nút quay lại, tiêu đề, thẻ góc đầu mở sẵn có ảnh, thẻ gập, câu dặn, ô đồng ý, nút. */
function GuideSkeleton() {
  return (
    <Screen>
      <View accessible accessibilityLabel="Đang tải" className="flex-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-1.5 h-4 w-48" />
        <Skeleton className="mt-4 h-64 rounded-lg" />
        <Skeleton className="mt-2.5 h-14 rounded-lg" />
        <Skeleton className="mt-3 h-24 rounded-lg" />
        <Skeleton className="mt-3 h-14 rounded-lg" />
        <Skeleton className="mt-auto h-[50px]" />
      </View>
    </Screen>
  )
}
