import { useState, type ComponentType } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  BicepsFlexed,
  CalendarDays,
  ChevronLeft,
  CloudOff,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DisclaimerText } from "@/components/DisclaimerText"
import { Label } from "@/components/ui/label"
import { PickerField } from "@/components/ui/picker"
import { Skeleton } from "@/components/ui/skeleton"
import { Stepper } from "@/components/Stepper"
import { FlowScreen } from "@/components/UserShell"
import { IconText, StatusBlock } from "@/components/StatusViews"
import { cn } from "@/lib/cn"
import { formatKg, formatNumber } from "@/lib/format"
import { joinTenths, range, splitTenths } from "@/lib/wheel"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GENDERS, GOALS } from "@/features/profile/types"
import { useProfile, usePatchProfile, useSaveBodyMetric } from "@/features/profile/api/useProfile"
import { BarbellRackIcon, BenchIcon, KettlebellIcon } from "@/features/onboarding/components/icons"

/**
 * Màn 2 concept-frontend-v1.md. Lưu sau MỖI bước (PATCH /me/profile), bỏ dở
 * quay lại tiếp được — bước đang mở lấy từ `profiles.onboarding_step` ở server,
 * không phải state cục bộ.
 *
 * Bước đang xem nằm ở URL (?step=) theo §5.1: reload không mất, gửi link được.
 *
 * Bước 6 của tài liệu ("mức tạ khởi điểm") nằm ở màn Chọn chương trình, không
 * ở đây: danh sách bài cần nhập tạ chỉ biết được SAU khi chọn template. Nhập
 * mò slug trước đó là bắt người dùng đoán. Vì vậy thanh tiến độ đếm 5, không 6.
 */
const STEPS = ["DISCLAIMER", "BODY", "GOAL", "EQUIPMENT", "EXPERIENCE"] as const

type Step = (typeof STEPS)[number]
type Icon = ComponentType<{ className?: string }>

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

// Nút tròn và ô lựa chọn giấu input radio/checkbox thật: viền focus phải vẽ lên label.
const HAS_FOCUS =
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--color-accent)]"

/** Chân mỗi bước: nút quay lại cạnh nút chính, sát đáy màn cho ngón cái. */
type Nav = { onBack?: () => void; error: string | null }

export function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const profile = useProfile()
  const patch = usePatchProfile()
  const saveBodyMetric = useSaveBodyMetric()

  const savedStep = profile.data?.onboardingStep as Step | undefined
  const urlStep = searchParams.get("step") as Step | null
  const current = STEPS.includes(urlStep as Step)
    ? (urlStep as Step)
    : STEPS.includes(savedStep as Step)
      ? (savedStep as Step)
      : "DISCLAIMER"
  const currentIndex = STEPS.indexOf(current)

  function goTo(index: number) {
    setSearchParams({ step: STEPS[index] })
  }

  async function advance(patchBody: Parameters<typeof patch.mutateAsync>[0]) {
    const next = STEPS[currentIndex + 1]
    await patch.mutateAsync({ ...patchBody, onboardingStep: next ?? "DONE" })
    if (next) {
      goTo(currentIndex + 1)
    } else {
      navigate("/program")
    }
  }

  if (profile.isLoading) {
    return <OnboardingSkeleton />
  }
  if (profile.isError) {
    return <StatusBlock icon={CloudOff} tone="danger" title="Không tải được hồ sơ" detail={profile.error.message} />
  }

  const heading = HEADINGS[current]
  const pending = patch.isPending || saveBodyMetric.isPending
  const nav: Nav = {
    onBack: currentIndex > 0 ? () => goTo(currentIndex - 1) : undefined,
    error: patch.isError ? patch.error.message : null,
  }

  return (
    <FlowScreen>
      {/* Ảnh chỉ phủ đầu màn rồi chìm vào nền. Không có cha định vị nên tràn hết chiều ngang;
          nội dung bên dưới là relative để vẽ đè lên ảnh. Khác ảnh màn đăng nhập cho đỡ lặp. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-cover bg-[center_40%]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 45%, transparent), color-mix(in srgb, var(--color-bg) 85%, transparent) 60%, var(--color-bg)), url(/onboarding/bg.jpg)",
        }}
      />
      <div className="relative flex flex-1 flex-col">
        <Stepper label="Hồ sơ" steps={STEPS.length} current={currentIndex} />
        <div className="mt-6 grid size-13 place-items-center rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] bg-[var(--color-accent-tint)] text-[var(--color-accent)]">
          <heading.icon className="size-6.5" />
        </div>
        <h1 className="mt-3.5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">
          {heading.title}
        </h1>
        <p className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">{heading.hint}</p>

        <div className="mt-5 flex flex-1 flex-col">
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
                await saveBodyMetric.mutateAsync({
                  heightCm: values.heightCm,
                  weightKg: values.weightKg,
                })
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
        </div>
      </div>
    </FlowScreen>
  )
}

/** Cùng khung với mọi bước: stepper, ô icon, tiêu đề, gợi ý, vùng nội dung và nút cuối. */
function OnboardingSkeleton() {
  return (
    <FlowScreen>
      <div role="status" aria-label="Đang tải" className="flex flex-1 flex-col">
        <Skeleton className="h-1.5 w-full" />
        <Skeleton className="mt-6 size-13 rounded-[var(--radius-lg)]" />
        <Skeleton className="mt-3.5 h-8 w-56" />
        <Skeleton className="mt-2.5 h-4 w-64" />
        <Skeleton className="mt-5 h-48 w-full" />
        <div className="flex-1" />
        <Skeleton className="mt-6 h-12 w-full" />
      </div>
    </FlowScreen>
  )
}

function StepFooter({
  nav,
  label,
  pending,
  disabled,
  onClick,
}: {
  nav: Nav
  label: string
  pending: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="mt-auto pt-6">
      {nav.error && (
        <IconText className="mb-3">Lưu thất bại: {nav.error}</IconText>
      )}
      <div className="flex gap-2.5">
        {nav.onBack && (
          <Button variant="secondary" className="w-[52px] px-0" aria-label="Quay lại" onClick={nav.onBack}>
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <Button className="flex-1" disabled={disabled || pending} onClick={onClick}>
          {pending ? "Đang lưu…" : label}
        </Button>
      </div>
    </div>
  )
}

/**
 * Hàng lựa chọn chiếm hết chiều ngang — design dùng kiểu này cho mọi câu hỏi
 * onboarding thay vì ô tick nhỏ: ngón tay bấm trúng dễ hơn.
 */
function OptionRow({
  type,
  name,
  label,
  icon: RowIcon,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox"
  name: string
  label: string
  icon?: Icon
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3 text-[15px]",
        HAS_FOCUS,
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-surface-2)]"
          : "border-transparent bg-[var(--color-surface)] text-[var(--color-text-muted)]",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {RowIcon && (
        <span
          className={cn(
            "grid size-10 flex-none place-items-center rounded-[var(--radius-md)]",
            checked
              ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
              : "bg-[var(--color-surface-2)]",
          )}
        >
          <RowIcon className="size-5.5" />
        </span>
      )}
      <span className="flex-1">{label}</span>
      {checked && <span className="font-bold text-[var(--color-accent)]">✓</span>}
    </label>
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
    <div className="flex flex-1 flex-col">
      <div className="space-y-4">
        <DisclaimerText />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Tôi đã đọc và đồng ý
        </label>
      </div>
      <StepFooter nav={nav} label="Tiếp tục" pending={pending} disabled={!checked} onClick={onAccept} />
    </div>
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
  onSubmit: (v: {
    birthYear?: number
    gender: string
    heightCm: number | null
    weightKg: number | null
  }) => void
}) {
  const [birthYear, setBirthYear] = useState(profile.birthYear)
  const [gender, setGender] = useState(profile.gender ?? "")
  const [heightCm, setHeightCm] = useState(profile.latestBodyMetric?.heightCm ?? null)
  const [weightKg, setWeightKg] = useState(profile.latestBodyMetric?.weightKg ?? null)

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Năm sinh" htmlFor="birthYear">
            <PickerField
              id="birthYear"
              title="Năm sinh"
              columns={[YEARS]}
              value={birthYear == null ? null : [birthYear]}
              start={[THIS_YEAR - 30]}
              display={birthYear == null ? null : String(birthYear)}
              onChange={([y]) => setBirthYear(y)}
            />
          </Field>
          <Field label="Chiều cao" htmlFor="heightCm">
            <PickerField
              id="heightCm"
              title="Chiều cao"
              unit="cm"
              columns={[HEIGHTS]}
              value={heightCm == null ? null : [heightCm]}
              start={[170]}
              display={heightCm == null ? null : `${formatNumber(heightCm)} cm`}
              onChange={([h]) => setHeightCm(h)}
            />
          </Field>
          <Field label="Cân nặng" htmlFor="weightKg">
            <PickerField
              id="weightKg"
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
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[var(--color-text-muted)]">
            Giới tính <span className="opacity-70">(tuỳ chọn)</span>
          </div>
          <div role="radiogroup" aria-label="Giới tính" className="flex flex-wrap gap-2">
            {GENDER_CHOICES.map((g) => (
              <label
                key={g.value}
                className={cn(
                  "flex h-10 cursor-pointer items-center rounded-full border px-3.5 text-sm font-semibold",
                  HAS_FOCUS,
                  gender === g.value
                    ? "border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                )}
              >
                <input
                  type="radio"
                  name="gender"
                  checked={gender === g.value}
                  onChange={() => setGender(g.value)}
                  className="sr-only"
                />
                {g.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        onClick={() =>
          onSubmit({ birthYear: birthYear ?? undefined, gender, heightCm, weightKg })
        }
      />
    </div>
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
    <div className="flex flex-1 flex-col">
      <div className="space-y-2">
        {options.map((o) => (
          <OptionRow
            key={o.value}
            type="radio"
            name="choice"
            label={o.label}
            icon={icons[o.value]}
            checked={selected === o.value}
            onChange={() => setSelected(o.value)}
          />
        ))}
      </div>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        disabled={!selected}
        onClick={() => onSubmit(selected)}
      />
    </div>
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
  function toggle(item: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, item] : prev.filter((v) => v !== item)))
  }
  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-4">
        <div className="kicker">Thiết bị sẵn có</div>
        <div className="space-y-2">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <OptionRow
              key={eq.value}
              type="checkbox"
              name="equipment"
              label={eq.label}
              icon={EQUIPMENT_ICONS[eq.value]}
              checked={selected.includes(eq.value)}
              onChange={(checked) => toggle(eq.value, checked)}
            />
          ))}
        </div>
        {selected.length === 0 && (
          <p className="text-xs text-[var(--color-danger)]">Chọn ít nhất một thiết bị.</p>
        )}
      </div>
      <StepFooter
        nav={nav}
        label="Tiếp tục"
        pending={pending}
        disabled={selected.length === 0}
        onClick={() => onSubmit(selected)}
      />
    </div>
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
    <div className="flex flex-1 flex-col">
      <div className="space-y-4">
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((e) => (
            <OptionRow
              key={e.value}
              type="radio"
              name="experience"
              label={e.label}
              icon={EXPERIENCE_ICONS[e.value]}
              checked={experience === e.value}
              onChange={() => setExperience(e.value)}
            />
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[var(--color-text-muted)]">Số buổi mỗi tuần</div>
          {/* Chỉ 5 giá trị: bấm một lần nhanh hơn mở khung cuộn. */}
          <div role="radiogroup" aria-label="Số buổi mỗi tuần" className="grid grid-cols-5 gap-2">
            {SESSIONS.map((n) => (
              <label
                key={n}
                className={cn(
                  "num grid h-13 cursor-pointer place-items-center rounded-[var(--radius-lg)] border text-xl",
                  HAS_FOCUS,
                  sessions === n
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-extrabold text-[var(--color-accent-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                )}
              >
                <input
                  type="radio"
                  name="sessions"
                  checked={sessions === n}
                  onChange={() => setSessions(n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
        </div>
      </div>
      <StepFooter
        nav={nav}
        label="Xong, chọn chương trình"
        pending={pending}
        disabled={!experience}
        onClick={() => onSubmit(experience, sessions)}
      />
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
