import { useState, type ComponentType } from "react"
import { Pressable, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  BicepsFlexed,
  CalendarDays,
  ChevronLeft,
  Dumbbell,
  Flame,
  HeartPulse,
  Ruler,
  ShieldCheck,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Target,
  Zap,
} from "lucide-react-native"
import { cn } from "@/lib/cn"
import { formatKg, formatNumber } from "@/lib/format"
import { joinTenths, range, splitTenths } from "@/lib/wheel"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GENDERS, GOALS } from "@/features/profile/types"
import { DisclaimerText } from "~/components/DisclaimerText"
import { FadedImage } from "~/components/FadedImage"
import { Kicker } from "~/components/Kicker"
import { Screen } from "~/components/Screen"
import { Stepper } from "~/features/onboarding/components/Stepper"
import { Button } from "~/components/ui/Button"
import { Checkbox } from "~/components/ui/Checkbox"
import { Label } from "~/components/ui/Label"
import { PickerField } from "~/components/ui/Picker"
import { BarbellRackIcon, BenchIcon, KettlebellIcon } from "~/features/onboarding/components/icons"
import { usePatchProfile, useProfile, useSaveBodyMetric } from "~/features/profile/api/useProfile"
import { colors } from "~/theme"

/**
 * Màn 2 concept-frontend-v1.md — bản mobile của OnboardingPage web. Lưu sau MỖI bước
 * (PATCH /me/profile), bỏ dở quay lại tiếp được: bước đang mở lấy từ `profiles.onboarding_step`
 * ở server. Bước đang xem nằm ở tham số `step` của route, như `?step=` bên web.
 *
 * Bước 6 của tài liệu ("mức tạ khởi điểm") nằm ở màn Chọn chương trình: danh sách bài cần nhập
 * tạ chỉ biết được SAU khi chọn template. Vì vậy thanh tiến độ đếm 5, không 6.
 */
const STEPS = ["DISCLAIMER", "BODY", "GOAL", "EQUIPMENT", "EXPERIENCE"] as const

type Step = (typeof STEPS)[number]
type Icon = ComponentType<{ color: string; size?: number }>

const HEADINGS: Record<Step, { title: string; hint: string; icon: Icon }> = {
  DISCLAIMER: { title: "Trước khi bắt đầu", hint: "Đọc và đồng ý để đi tiếp.", icon: ShieldCheck },
  BODY: {
    title: "Vài số về cơ thể bạn",
    hint: "Nhập tay. Không đồng bộ từ ứng dụng sức khoẻ nào.",
    icon: Ruler,
  },
  GOAL: { title: "Bạn muốn gì từ 8 tuần tới?", hint: "Chọn một. Đổi được sau ở Cài đặt › Hồ sơ.", icon: Target },
  EQUIPMENT: {
    title: "Bạn tập ở đâu, có những gì?",
    hint: "Chương trình đề xuất chỉ dùng thiết bị bạn có.",
    icon: Dumbbell,
  },
  EXPERIENCE: {
    title: "Bạn tập được bao lâu rồi?",
    hint: "Số buổi mỗi tuần quyết định lịch tuần trông thế nào.",
    icon: CalendarDays,
  },
}

// Icon theo giá trị trong features/profile/types — màn Hồ sơ dùng chung danh sách nhưng không cần icon.
const GOAL_ICONS: Record<string, Icon> = {
  MUSCLE: BicepsFlexed,
  STRENGTH: Zap,
  FAT_LOSS: Flame,
  GENERAL: HeartPulse,
}
const EQUIPMENT_ICONS: Record<string, Icon> = {
  BARBELL_RACK: BarbellRackIcon,
  DUMBBELL: Dumbbell,
  KETTLEBELL: KettlebellIcon,
  BENCH: BenchIcon,
}
// Cột sóng tăng dần theo số năm tập.
const EXPERIENCE_ICONS: Record<string, Icon> = {
  NEW: SignalLow,
  LT_1Y: SignalMedium,
  "1_3Y": SignalHigh,
  GT_3Y: Signal,
}

/** Chân mỗi bước: nút quay lại cạnh nút chính, sát đáy màn cho ngón cái. */
type Nav = { onBack?: () => void; error: string | null }

export default function OnboardingScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ step?: string }>()
  const profile = useProfile()
  const patch = usePatchProfile()
  const saveBodyMetric = useSaveBodyMetric()

  const savedStep = profile.data?.onboardingStep as Step | undefined
  const urlStep = params.step as Step | undefined
  const current = STEPS.includes(urlStep as Step)
    ? (urlStep as Step)
    : STEPS.includes(savedStep as Step)
      ? (savedStep as Step)
      : "DISCLAIMER"
  const currentIndex = STEPS.indexOf(current)

  function goTo(index: number) {
    router.setParams({ step: STEPS[index] })
  }

  async function advance(patchBody: Parameters<typeof patch.mutateAsync>[0]) {
    const next = STEPS[currentIndex + 1]
    await patch.mutateAsync({ ...patchBody, onboardingStep: next ?? "DONE" })
    if (next) {
      goTo(currentIndex + 1)
    } else {
      router.replace("/program")
    }
  }

  if (profile.isLoading) {
    return (
      <Screen>
        <Text className="text-sm text-text-muted">Đang tải hồ sơ…</Text>
      </Screen>
    )
  }
  if (profile.isError) {
    return (
      <Screen>
        <Text className="text-sm text-danger">{profile.error.message}</Text>
      </Screen>
    )
  }

  const heading = HEADINGS[current]
  const pending = patch.isPending || saveBodyMetric.isPending
  const nav: Nav = {
    onBack: currentIndex > 0 ? () => goTo(currentIndex - 1) : undefined,
    error: patch.isError ? patch.error.message : null,
  }

  return (
    // Ảnh khác màn đăng nhập cho đỡ lặp (quyết định 09-25).
    <Screen background={<FadedImage path="/onboarding/bg.jpg" height={300} top={0.45} mid={0.85} midAt={0.6} />}>
      <Stepper label="Hồ sơ" steps={STEPS.length} current={currentIndex} />
      <View className="mt-6 size-[52px] items-center justify-center rounded-lg border border-accent/25 bg-accent-tint">
        <heading.icon color={colors.accent} size={26} />
      </View>
      <Text className="mt-3.5 text-[28px] font-extrabold leading-[31px] tracking-[-0.5px] text-text">
        {heading.title}
      </Text>
      <Text className="mt-2.5 text-[13px] text-text-muted">{heading.hint}</Text>

      <View className="mt-5 flex-1">
        {current === "DISCLAIMER" && (
          <DisclaimerStep
            accepted={profile.data!.disclaimerAt != null}
            pending={pending}
            nav={nav}
            onAccept={() => advance({ acceptDisclaimer: true })}
          />
        )}

        {current === "BODY" && (
          <BodyStep
            profile={profile.data!}
            pending={pending}
            nav={nav}
            onSubmit={async (values) => {
              await saveBodyMetric.mutateAsync({ heightCm: values.heightCm, weightKg: values.weightKg })
              await advance({ birthYear: values.birthYear, gender: values.gender || undefined })
            }}
          />
        )}

        {current === "GOAL" && (
          <ChoiceStep
            options={GOALS}
            icons={GOAL_ICONS}
            value={profile.data!.goal}
            pending={pending}
            nav={nav}
            onSubmit={(goal) => advance({ goal })}
          />
        )}

        {current === "EQUIPMENT" && (
          <EquipmentStep
            value={profile.data!.equipment}
            pending={pending}
            nav={nav}
            onSubmit={(equipment) => advance({ equipment })}
          />
        )}

        {current === "EXPERIENCE" && (
          <ExperienceStep
            profile={profile.data!}
            pending={pending}
            nav={nav}
            onSubmit={(experience, sessionsPerWeek) => advance({ experience, sessionsPerWeek })}
          />
        )}
      </View>
    </Screen>
  )
}

function StepFooter({
  nav,
  label,
  pending,
  disabled,
  onPress,
}: {
  nav: Nav
  label: string
  pending: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <View className="mt-auto pt-6">
      {nav.error && <Text className="mb-3 text-sm text-danger">Lưu thất bại: {nav.error}</Text>}
      <View className="flex-row gap-2.5">
        {nav.onBack && (
          <Button variant="secondary" className="w-[52px] px-0" accessibilityLabel="Quay lại" onPress={nav.onBack}>
            <ChevronLeft size={20} color={colors.text} />
          </Button>
        )}
        <Button className="flex-1" disabled={disabled || pending} onPress={onPress}>
          {pending ? "Đang lưu…" : label}
        </Button>
      </View>
    </View>
  )
}

/**
 * Hàng lựa chọn chiếm hết chiều ngang — design dùng kiểu này cho mọi câu hỏi onboarding thay vì
 * ô tick nhỏ: ngón tay bấm trúng dễ hơn.
 */
function OptionRow({
  role,
  label,
  icon: RowIcon,
  checked,
  onPress,
}: {
  role: "radio" | "checkbox"
  label: string
  icon?: Icon
  checked: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-md border p-3",
        checked ? "border-accent bg-surface-2" : "border-transparent bg-surface",
      )}
    >
      {RowIcon && (
        <View
          className={cn(
            "size-10 items-center justify-center rounded-md",
            checked ? "bg-accent-tint" : "bg-surface-2",
          )}
        >
          <RowIcon size={22} color={checked ? colors.accent : colors["text-muted"]} />
        </View>
      )}
      <Text className={cn("flex-1 text-[15px]", checked ? "text-text" : "text-text-muted")}>{label}</Text>
      {checked && <Text className="font-bold text-accent">✓</Text>}
    </Pressable>
  )
}

/** A2 — nội dung chính xác còn treo (F1 §8 concept-frontend-v1.md, PM + pháp lý chốt). */
function DisclaimerStep({
  accepted,
  pending,
  nav,
  onAccept,
}: {
  accepted: boolean
  pending: boolean
  nav: Nav
  onAccept: () => void
}) {
  const [checked, setChecked] = useState(accepted)
  return (
    <View className="flex-1">
      <View className="gap-4">
        <DisclaimerText />
        <Checkbox checked={checked} onChange={setChecked} className="items-center">
          <Text className="text-sm text-text">Tôi đã đọc và đồng ý</Text>
        </Checkbox>
      </View>
      <StepFooter nav={nav} label="Tiếp tục" pending={pending} disabled={!checked} onPress={onAccept} />
    </View>
  )
}

const THIS_YEAR = new Date().getFullYear()
// Khoảng trong cột cuộn. Giá trị cũ nằm ngoài vẫn hiện đúng trong ô, mở khung thì về số gần nhất.
const YEARS = range(THIS_YEAR - 90, THIS_YEAR - 13)
const HEIGHTS = range(120, 220)
const WHOLE_KG = range(30, 200)
const TENTHS = range(0, 9)
const GENDER_CHOICES = [{ value: "", label: "Không muốn nói" }, ...GENDERS]

function BodyStep({
  profile,
  pending,
  nav,
  onSubmit,
}: {
  profile: {
    birthYear: number | null
    gender: string | null
    latestBodyMetric: { heightCm: number | null; weightKg: number | null } | null
  }
  pending: boolean
  nav: Nav
  onSubmit: (v: { birthYear?: number; gender: string; heightCm: number | null; weightKg: number | null }) => void
}) {
  const [birthYear, setBirthYear] = useState(profile.birthYear)
  const [gender, setGender] = useState(profile.gender ?? "")
  const [heightCm, setHeightCm] = useState(profile.latestBodyMetric?.heightCm ?? null)
  const [weightKg, setWeightKg] = useState(profile.latestBodyMetric?.weightKg ?? null)

  return (
    <View className="flex-1">
      <View className="gap-4">
        {/* Lưới 2 cột của web: hai ô một hàng, ô thứ ba xuống hàng dưới với cùng bề rộng. */}
        <View className="flex-row flex-wrap gap-2.5">
          <Field label="Năm sinh">
            <PickerField
              title="Năm sinh"
              columns={[YEARS]}
              value={birthYear == null ? null : [birthYear]}
              start={[THIS_YEAR - 30]}
              display={birthYear == null ? null : String(birthYear)}
              onChange={([y]) => setBirthYear(y)}
            />
          </Field>
          <Field label="Chiều cao">
            <PickerField
              title="Chiều cao"
              unit="cm"
              columns={[HEIGHTS]}
              value={heightCm == null ? null : [heightCm]}
              start={[170]}
              display={heightCm == null ? null : `${formatNumber(heightCm)} cm`}
              onChange={([h]) => setHeightCm(h)}
            />
          </Field>
          <Field label="Cân nặng">
            <PickerField
              title="Cân nặng"
              unit="kg"
              separator=","
              columns={[WHOLE_KG, TENTHS]}
              columnLabels={["Cân nặng, số kg", "Cân nặng, phần lẻ"]}
              value={weightKg == null ? null : splitTenths(weightKg)}
              start={[65, 0]}
              display={weightKg == null ? null : formatKg(weightKg)}
              onChange={([whole, tenth]) => setWeightKg(joinTenths(whole, tenth))}
            />
          </Field>
        </View>
        <View className="gap-1.5">
          <Label>
            Giới tính <Text className="opacity-70">(tuỳ chọn)</Text>
          </Label>
          <View accessibilityRole="radiogroup" accessibilityLabel="Giới tính" className="flex-row flex-wrap gap-2">
            {GENDER_CHOICES.map((g) => {
              const on = gender === g.value
              return (
                <Pressable
                  key={g.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setGender(g.value)}
                  className={cn(
                    "h-10 justify-center rounded-full border px-3.5",
                    on ? "border-accent bg-surface-2" : "border-border bg-surface",
                  )}
                >
                  <Text className={cn("text-sm font-semibold", on ? "text-text" : "text-text-muted")}>
                    {g.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        onPress={() => onSubmit({ birthYear: birthYear ?? undefined, gender, heightCm, weightKg })}
      />
    </View>
  )
}

function ChoiceStep({
  options,
  icons,
  value,
  pending,
  nav,
  onSubmit,
}: {
  options: readonly { value: string; label: string }[]
  icons: Record<string, Icon>
  value: string | null
  pending: boolean
  nav: Nav
  onSubmit: (value: string) => void
}) {
  const [selected, setSelected] = useState(value ?? "")
  return (
    <View className="flex-1">
      <View accessibilityRole="radiogroup" className="gap-2">
        {options.map((o) => (
          <OptionRow
            key={o.value}
            role="radio"
            label={o.label}
            icon={icons[o.value]}
            checked={selected === o.value}
            onPress={() => setSelected(o.value)}
          />
        ))}
      </View>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        disabled={!selected}
        onPress={() => onSubmit(selected)}
      />
    </View>
  )
}

function EquipmentStep({
  value,
  pending,
  nav,
  onSubmit,
}: {
  value: string[]
  pending: boolean
  nav: Nav
  onSubmit: (equipment: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(value)
  function toggle(item: string) {
    setSelected((prev) => (prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]))
  }
  return (
    <View className="flex-1">
      <View className="gap-4">
        <Kicker>Thiết bị sẵn có</Kicker>
        <View className="gap-2">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <OptionRow
              key={eq.value}
              role="checkbox"
              label={eq.label}
              icon={EQUIPMENT_ICONS[eq.value]}
              checked={selected.includes(eq.value)}
              onPress={() => toggle(eq.value)}
            />
          ))}
        </View>
        {selected.length === 0 && <Text className="text-xs text-danger">Chọn ít nhất một thiết bị.</Text>}
      </View>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        disabled={selected.length === 0}
        onPress={() => onSubmit(selected)}
      />
    </View>
  )
}

const SESSIONS = range(2, 6)

function ExperienceStep({
  profile,
  pending,
  nav,
  onSubmit,
}: {
  profile: { experience: string | null; sessionsPerWeek: number | null }
  pending: boolean
  nav: Nav
  onSubmit: (experience: string, sessionsPerWeek: number) => void
}) {
  const [experience, setExperience] = useState(profile.experience ?? "")
  const [sessions, setSessions] = useState(profile.sessionsPerWeek ?? 3)
  return (
    <View className="flex-1">
      <View className="gap-4">
        <View accessibilityRole="radiogroup" className="gap-2">
          {EXPERIENCE_LEVELS.map((e) => (
            <OptionRow
              key={e.value}
              role="radio"
              label={e.label}
              icon={EXPERIENCE_ICONS[e.value]}
              checked={experience === e.value}
              onPress={() => setExperience(e.value)}
            />
          ))}
        </View>
        <View className="gap-1.5">
          <Label>Số buổi mỗi tuần</Label>
          {/* Chỉ 5 giá trị: bấm một lần nhanh hơn mở khung cuộn. */}
          <View accessibilityRole="radiogroup" accessibilityLabel="Số buổi mỗi tuần" className="flex-row gap-2">
            {SESSIONS.map((n) => {
              const on = sessions === n
              return (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setSessions(n)}
                  className={cn(
                    "h-[52px] flex-1 items-center justify-center rounded-lg border",
                    on ? "border-accent bg-accent" : "border-border bg-surface",
                  )}
                >
                  <Text
                    className={cn("text-xl", on ? "font-extrabold text-accent-fg" : "text-text-muted")}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {n}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
      <StepFooter
        nav={nav}
        label="Xong, chọn chương trình"
        pending={pending}
        disabled={!experience}
        onPress={() => onSubmit(experience, sessions)}
      />
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // Hai ô một hàng: mỗi ô gần nửa bề rộng, trừ khoảng cách 10px ở giữa.
    <View className="gap-1.5" style={{ width: "48.5%" }}>
      <Label>{label}</Label>
      {children}
    </View>
  )
}
