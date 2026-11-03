import { Text, View } from "react-native"
import { CircleAlert, Dumbbell } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { EQUIPMENT_VI } from "@/lib/equipment"
import { MUSCLE_VI } from "@/lib/muscles"
import { ExerciseImage } from "~/components/ExerciseImage"
import { SectionTitle } from "~/components/SectionTitle"
import { colors } from "~/theme"

/**
 * Phần thân thông tin một bài — bản mobile của web/src/components/ExerciseGuideBody.tsx: ảnh động, mô tả,
 * cơ chính, dụng cụ, cách tập, lỗi hay gặp. Dùng ở khung chi tiết bài của màn Chương trình
 * (features/schedule) và thẻ bài trong trợ lý (features/assistant).
 *
 * `title` chỉ truyền khi khung ngoài chưa hiện tên bài (thẻ trợ lý); khung chi tiết đã có tên ở
 * tiêu đề nên bỏ qua. `equipment` không truyền thì không có dòng dụng cụ; mảng rỗng là tập tay không.
 *
 * `inCard`: khung ngoài không có lề (thẻ trợ lý, khung đã bo góc và cắt tràn) nên ảnh chạy sát mép khung,
 * chữ bên dưới tự có lề ngang và lề dưới. Khung chi tiết bài không truyền.
 */
export function ExerciseGuideBody({
  slug,
  title,
  description,
  muscleGroups,
  equipment,
  stepsVi,
  mistakesVi,
  inCard,
}: {
  slug: string
  title?: string
  description?: string | null
  muscleGroups: string[]
  equipment?: string[]
  stepsVi: string[]
  mistakesVi: string[]
  inCard?: boolean
}) {
  return (
    // px-3.5 của khung ngoài và -mx-3.5 của khối ảnh triệt nhau: chỉ ảnh sát mép, chữ vẫn có lề.
    <View className={inCard ? "px-3.5 pb-3.5" : undefined}>
      {/* alt rỗng: tên bài luôn hiện thành chữ ngay cạnh (tiêu đề khung chi tiết hoặc `title` của thẻ), alt có chữ thì VoiceOver đọc tên hai lần. */}
      <View className={inCard ? "-mx-3.5" : undefined}>
        <ExerciseImage slug={slug} alt="" variant="large" inCard={inCard} />
      </View>
      {title && <Text className="mt-3 text-base font-extrabold tracking-[-0.2px] text-text">{title}</Text>}
      {description && <Text className="mt-3.5 text-sm leading-[22px] text-text">{description}</Text>}

      {muscleGroups.length > 0 && (
        <>
          <SectionTitle className="mt-5">Cơ chính</SectionTitle>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {muscleGroups.map((code, i) => (
              <View key={code} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-accent-tint" : "bg-surface-2")}>
                <Text className={cn("text-xs font-bold", i === 0 ? "text-accent" : "text-text-muted")}>
                  {MUSCLE_VI[code] ?? code}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {equipment && (
        <View className="mt-2.5 flex-row items-center gap-1.5">
          <Dumbbell size={16} color={colors["text-muted"]} />
          <Text className="flex-1 text-[13px] text-text-muted">
            Dụng cụ:{" "}
            <Text className="font-semibold text-text">
              {equipment.length > 0 ? equipment.map((code) => EQUIPMENT_VI[code] ?? code).join(", ") : "Không cần"}
            </Text>
          </Text>
        </View>
      )}

      {stepsVi.length > 0 && (
        <>
          <SectionTitle className="mt-5">Cách tập</SectionTitle>
          <View className="mt-1.5">
            {/* key theo chỉ số: danh sách tĩnh, mà dữ liệu nhập vào có thể lặp nguyên một dòng. */}
            {stepsVi.map((step, i) => (
              <View key={i} className="flex-row gap-2.5 py-1.5">
                <View className="mt-0.5 size-[22px] items-center justify-center rounded-full bg-surface-2">
                  <Text className="text-xs font-extrabold text-text">{i + 1}</Text>
                </View>
                <Text className="flex-1 text-sm leading-[22px] text-text">{step}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {mistakesVi.length > 0 && (
        <>
          <SectionTitle className="mt-5">Lỗi hay gặp</SectionTitle>
          <View className="mt-2 rounded-md border border-warn/30 bg-warn-tint px-3 py-1">
            {mistakesVi.map((m, i) => (
              <View key={i} className="flex-row gap-2 py-1.5">
                <CircleAlert size={16} color={colors.warn} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-[13px] leading-5 text-text">{m}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}
