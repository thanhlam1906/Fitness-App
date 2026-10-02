import { useState, type ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ChevronDown, ChevronRight } from "lucide-react-native"
import { cn } from "@/lib/cn"
import { EQUIPMENT_OPTIONS } from "@/features/profile/types"
import { defaultTrainingDays, WEEKDAYS } from "@/features/program/schema"
import { ApiError } from "~/api/client"
import { isoDay, START_OFFSETS, startLabel } from "~/lib/dates"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { PickerField } from "~/components/ui/Picker"
import { loadableExercises, useCandidates, type TemplateCandidate } from "~/features/program/useCandidates"
import { useCreateProgram } from "~/features/program/useCreateProgram"
import { useProfile } from "~/features/profile/useProfile"
import { useOpenFirstWorkout } from "~/features/schedule/useSchedule"
import { colors } from "~/theme"

const ORDINALS = ["Đề xuất chính", "Phương án hai", "Phương án ba", "Phương án bốn"]
const ALL_DAYS = WEEKDAYS.map((d) => d.value)
/**
 * Màn 3 concept-frontend-v1.md — bản mobile của ProgramSelectionPage web: đề xuất template, XEM
 * CẤU TRÚC TUẦN rồi xác nhận, chọn ngày tập (API nhận restDays, đảo lại khi gửi), ngày bắt đầu
 * và mức tạ khởi điểm (A7: chỉ biết bài cần tạ sau khi chọn template).
 */
export default function ProgramScreen() {
  const router = useRouter()
  const candidates = useCandidates()
  const createProgram = useCreateProgram()
  const openFirstWorkout = useOpenFirstWorkout()
  const profile = useProfile()

  const [templateId, setTemplateId] = useState("")
  // Đặt lại mỗi lần chọn template, theo số buổi đã khai (defaultTrainingDays).
  const [trainingDays, setTrainingDays] = useState<number[]>([])
  const [startOffset, setStartOffset] = useState(0)
  const [loads, setLoads] = useState<Record<string, string>>({})
  const [showOthers, setShowOthers] = useState<boolean | null>(null)

  const selected = candidates.data?.find((c) => c.id === templateId) ?? null
  const loadable = selected ? loadableExercises(selected) : []

  if (candidates.isLoading) {
    return (
      <Screen>
        <Text className="text-sm text-text-muted">Đang tải đề xuất…</Text>
      </Screen>
    )
  }

  if (candidates.isError) {
    const needsOnboarding = candidates.error instanceof ApiError && candidates.error.status === 404
    return (
      <EmptyState
        message={
          needsOnboarding
            ? "Cần hoàn tất hồ sơ trước khi đề xuất chương trình."
            : `Không tải được đề xuất: ${candidates.error.message}`
        }
        action={{ to: "/onboarding", label: needsOnboarding ? "Hoàn tất hồ sơ" : "Về onboarding" }}
      />
    )
  }

  if (candidates.data!.length === 0) {
    return (
      <EmptyState
        message="Chưa có chương trình nào hợp thiết bị bạn đã khai. Tự thiết kế lịch, hoặc chỉnh thiết bị ở Hồ sơ."
        action={{ to: "/settings/profile", label: "Mở hồ sơ" }}
      />
    )
  }

  const restDays = ALL_DAYS.filter((d) => !trainingDays.includes(d))
  // Không có template đúng số buổi thì nhóm lệch số buổi thành danh sách chính, không giấu đi.
  const exact = candidates.data!.filter((c) => c.matchesSessions)
  const others = candidates.data!.filter((c) => !c.matchesSessions)
  const main = exact.length > 0 ? exact : others
  // Nhóm đúng số buổi ít thì mở sẵn: vd người có tạ đòn tập 6 buổi chỉ khớp bài tay không, các
  // template tạ đòn nằm ở đây. Nhiều thì gập lại cho danh sách đỡ dài.
  const othersOpen = showOthers ?? exact.length < 3
  const card = (template: TemplateCandidate, rank: string) => (
    <TemplateCard
      key={template.id}
      template={template}
      rank={rank}
      selected={template.id === templateId}
      onSelect={() => {
        setTemplateId(template.id)
        setTrainingDays(defaultTrainingDays(template, profile.data?.sessionsPerWeek))
      }}
    />
  )

  function create() {
    if (!selected) return
    createProgram.mutate(
      {
        templateId: selected.id,
        restDays,
        startDate: isoDay(startOffset),
        startingLoadsBySlug: Object.fromEntries(
          Object.entries(loads)
            .filter(([, value]) => value.trim() !== "")
            // Bàn phím số iOS tiếng Việt gõ dấu phẩy thập phân ("62,5"): Number() cần dấu chấm.
            .map(([slug, value]) => [slug, Number(value.replace(",", "."))]),
        ),
      },
      // Không còn màn "Xong": vào thẳng Lịch ở buổi đầu tiên.
      { onSuccess: openFirstWorkout },
    )
  }

  return (
    <Screen>
      <Kicker>Đề xuất cho hồ sơ của bạn</Kicker>
      <Text
        className="mt-3 text-[28px] font-extrabold tracking-[-0.5px] text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {exact.length > 0 ? `${exact.length} chương trình phù hợp` : "Chọn chương trình gần nhất"}
      </Text>
      {exact.length === 0 && (
        <Text className="mt-2 text-[13px] leading-5 text-text-muted">
          Chưa có chương trình đúng số buổi/tuần bạn chọn. Các chương trình dưới đây hợp thiết bị của
          bạn, ngày tập bạn tự chọn.
        </Text>
      )}

      <View className="mt-5 gap-3">{main.map((template, i) => card(template, ORDINALS[i] ?? `Phương án ${i + 1}`))}</View>

      {exact.length > 0 && others.length > 0 && (
        <View className="mt-5">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: othersOpen }}
            onPress={() => setShowOthers(!othersOpen)}
            className="flex-row items-center gap-1"
          >
            {othersOpen ? (
              <ChevronDown size={14} color={colors["text-muted"]} />
            ) : (
              <ChevronRight size={14} color={colors["text-muted"]} />
            )}
            <Kicker>Số buổi khác · {others.length}</Kicker>
          </Pressable>
          {othersOpen && <View className="mt-3 gap-3">{others.map((template) => card(template, "Khác số buổi"))}</View>}
        </View>
      )}

      <Button variant="secondary" className="mt-3 w-full" onPress={() => router.push("/my-schedule")}>
        Tự thiết kế lịch riêng
      </Button>

      {selected && (
        <>
          <Kicker className="mt-6">Ngày tập trong tuần</Kicker>
          <View className="mt-2.5 flex-row gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = trainingDays.includes(d.value)
              return (
                <Pressable
                  key={d.value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() =>
                    setTrainingDays((prev) => (on ? prev.filter((v) => v !== d.value) : [...prev, d.value]))
                  }
                  className={cn("flex-1 items-center rounded-lg py-3", on ? "bg-accent" : "bg-surface")}
                >
                  <Text className={cn("text-[13px]", on ? "font-bold text-accent-fg" : "text-text-muted")}>
                    {d.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text className="mt-2 text-[11px] text-text-muted">Đổi được sau, không mất tiến độ.</Text>
          {trainingDays.length === 0 && <Text className="mt-2 text-xs text-danger">Chọn ít nhất một ngày tập.</Text>}

          <View className="mt-5 gap-1.5">
            <Label>Ngày bắt đầu</Label>
            <PickerField
              title="Ngày bắt đầu"
              columns={[START_OFFSETS]}
              value={[startOffset]}
              start={[0]}
              display={startLabel(startOffset)}
              formatValue={startLabel}
              onChange={([offset]) => setStartOffset(offset)}
            />
          </View>

          {/* Template tay không không có bài nào cần tạ: bỏ cả mục, không để tiêu đề trơ. */}
          {loadable.length > 0 && (
            <>
              <Kicker className="mt-6">Mức tạ khởi điểm</Kicker>
              <Text className="mt-2 text-[13px] leading-5 text-text-muted">
                Chọn mức bạn làm được 2 set đầu mà vẫn còn dư sức. Bỏ trống cũng được — lúc đó lịch không
                gợi ý tải và bạn tự nhập trong buổi đầu.
              </Text>
              <View className="mt-3 gap-3">
                {loadable.map((exercise) => (
                  <View key={exercise.slug} className="flex-row items-center gap-3">
                    <Text className="flex-1 text-[15px] text-text">{exercise.name}</Text>
                    <Input
                      accessibilityLabel={`Mức tạ ${exercise.name}`}
                      keyboardType="decimal-pad"
                      placeholder="kg"
                      className="w-28"
                      style={{ fontVariant: ["tabular-nums"] }}
                      value={loads[exercise.slug] ?? ""}
                      onChangeText={(text) => setLoads((prev) => ({ ...prev, [exercise.slug]: text }))}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {createProgram.isError && (
            <Text className="mt-3 text-sm text-danger">Tạo chương trình thất bại: {createProgram.error.message}</Text>
          )}

          <Button
            className="mt-6 w-full"
            // Còn khoá sau khi tạo xong: lúc đang lấy lịch mới để chuyển trang, bấm lần nữa sẽ tạo
            // chương trình thứ hai và dừng chương trình vừa tạo.
            disabled={createProgram.isPending || createProgram.isSuccess || trainingDays.length === 0}
            onPress={create}
          >
            {createProgram.isPending ? "Đang tạo…" : "Bắt đầu chương trình"}
          </Button>
        </>
      )}
    </Screen>
  )
}

/** §5.1 — "Người dùng xem cấu trúc rồi xác nhận hoặc đổi." Cấu trúc phải xem được TRƯỚC khi chọn. */
function TemplateCard({
  template,
  rank,
  selected,
  onSelect,
}: {
  template: TemplateCandidate
  rank: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onSelect}
      className={cn(
        "rounded-xl border p-4",
        selected ? "border-accent bg-surface-2" : "border-transparent bg-surface",
      )}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={cn(
            "text-[11px] font-bold uppercase tracking-[1.1px]",
            selected ? "text-accent" : "text-text-muted",
          )}
        >
          {rank}
        </Text>
        {selected && (
          <View className="rounded-full bg-accent px-2.5 py-0.5">
            <Text className="text-[11px] font-bold text-accent-fg">Đang chọn</Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-[19px] font-bold text-text">{template.name}</Text>
      {template.methodology && (
        <Text className="mt-2 text-[13px] leading-5 text-text-muted">{template.methodology}</Text>
      )}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        <Tag selected={selected}>
          {template.sessionsMin === template.sessionsMax
            ? template.sessionsMin
            : `${template.sessionsMin}–${template.sessionsMax}`}{" "}
          buổi/tuần
        </Tag>
        <Tag selected={selected}>{template.days.length} buổi trong chu kỳ</Tag>
        <Tag selected={selected}>{equipmentLabel(template.requiredEquipment)}</Tag>
      </View>

      {selected && (
        <View className="mt-4 gap-2 border-t border-border pt-4">
          {template.days.map((day) => (
            <View key={day.order}>
              <Text className="text-[13px] font-semibold text-text">Buổi {day.label}</Text>
              <Text className="mt-0.5 text-xs leading-5 text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                {day.exercises
                  .map((ex) => `${ex.name} ${ex.sets}×${ex.repsMin}${ex.repsMax > ex.repsMin ? `–${ex.repsMax}` : ""}`)
                  .join(" · ")}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  )
}

function equipmentLabel(required: string[]) {
  if (required.length === 0) return "Không dụng cụ"
  return EQUIPMENT_OPTIONS.filter((o) => required.includes(o.value))
    .map((o) => o.label)
    .join(", ")
}

function Tag({ selected, children }: { selected: boolean; children: ReactNode }) {
  return (
    <View className={cn("rounded-full px-2.5 py-1", selected ? "bg-surface" : "bg-surface-2")}>
      <Text className="text-[11px] text-text-muted" style={{ fontVariant: ["tabular-nums"] }}>
        {children}
      </Text>
    </View>
  )
}

function EmptyState({ message, action }: { message: string; action: { to: string; label: string } }) {
  const router = useRouter()
  return (
    <Screen>
      <Card className="gap-3">
        <Text className="text-sm text-text-muted">{message}</Text>
        {/* Lịch tự thiết kế không cần hồ sơ hay template: lối ra này luôn phải có. */}
        <View className="flex-row flex-wrap gap-2">
          <Button onPress={() => router.push(action.to)}>{action.label}</Button>
          <Button variant="secondary" onPress={() => router.push("/my-schedule")}>
            Tự thiết kế lịch riêng
          </Button>
        </View>
      </Card>
    </Screen>
  )
}
