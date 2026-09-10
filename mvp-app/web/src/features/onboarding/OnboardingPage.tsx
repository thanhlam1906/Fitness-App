import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Stepper } from "@/components/Stepper"
import { FlowScreen } from "@/components/UserShell"
import { cn } from "@/lib/cn"
import { EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GENDERS, GOALS } from "@/features/profile/types"
import { useProfile, usePatchProfile, useSaveBodyMetric } from "@/features/profile/useProfile"

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

const HEADINGS: Record<Step, { title: string; hint: string }> = {
  DISCLAIMER: { title: "Trước khi bắt đầu", hint: "Đọc và đồng ý để đi tiếp." },
  BODY: { title: "Vài số về cơ thể bạn", hint: "Nhập tay. Không đồng bộ từ ứng dụng sức khoẻ nào." },
  GOAL: { title: "Bạn muốn gì từ 8 tuần tới?", hint: "Chọn một. Đổi được sau ở màn Hồ sơ." },
  EQUIPMENT: {
    title: "Bạn tập ở đâu, có những gì?",
    hint: "Chương trình đề xuất chỉ dùng thiết bị bạn có.",
  },
  EXPERIENCE: {
    title: "Bạn tập được bao lâu rồi?",
    hint: "Số buổi mỗi tuần quyết định lịch tuần trông thế nào.",
  },
}

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
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải hồ sơ…</p>
  }
  if (profile.isError) {
    return <p className="text-sm text-[var(--color-danger)]">{profile.error.message}</p>
  }

  const heading = HEADINGS[current]
  const pending = patch.isPending || saveBodyMetric.isPending

  return (
    <FlowScreen>
      <Stepper label="Hồ sơ" steps={STEPS.length} current={currentIndex} />
      <h1 className="mt-5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">
        {heading.title}
      </h1>
      <p className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">{heading.hint}</p>

      <div className="mt-5">
        {current === "DISCLAIMER" && (
          <DisclaimerStep
            accepted={profile.data!.disclaimerAt != null}
            pending={pending}
            onAccept={() => advance({ acceptDisclaimer: true })}
          />
        )}

        {current === "BODY" && (
          <BodyStep
            profile={profile.data!}
            pending={pending}
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
            value={profile.data!.goal}
            pending={pending}
            onSubmit={(goal) => advance({ goal })}
          />
        )}

        {current === "EQUIPMENT" && (
          <EquipmentStep
            value={profile.data!.equipment}
            pending={pending}
            onSubmit={(equipment) => advance({ equipment })}
          />
        )}

        {current === "EXPERIENCE" && (
          <ExperienceStep
            profile={profile.data!}
            pending={pending}
            onSubmit={(experience, sessionsPerWeek) => advance({ experience, sessionsPerWeek })}
          />
        )}
      </div>

      {patch.isError && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">
          Lưu thất bại: {patch.error.message}
        </p>
      )}

      <div className="flex-1" />
      <p className="mt-6 text-[11px] text-[var(--color-text-muted)]">
        Lưu sau mỗi bước — bỏ dở thì mở lại đúng chỗ này.
      </p>
      {currentIndex > 0 && (
        <Button
          variant="secondary"
          className="mt-3 self-start"
          onClick={() => goTo(currentIndex - 1)}
        >
          Quay lại
        </Button>
      )}
    </FlowScreen>
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
  checked,
  onChange,
}: {
  type: "radio" | "checkbox"
  name: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] border p-3.5 text-[15px]",
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
      {label}
      {checked && <span className="font-bold text-[var(--color-accent)]">✓</span>}
    </label>
  )
}

/** A2 — nội dung chính xác còn treo (F1 §8 concept-frontend-v1.md, PM + pháp lý chốt). */
function DisclaimerStep({
  accepted,
  pending,
  onAccept,
}: {
  accepted: boolean
  pending: boolean
  onAccept: () => void
}) {
  const [checked, setChecked] = useState(accepted)
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5 text-sm leading-relaxed">
        <p>
          Ứng dụng này <strong>không phải công cụ y tế hay vật lý trị liệu</strong>. Nội dung ở đây
          là gợi ý tập luyện chung, không thay thế chẩn đoán hay điều trị của nhân viên y tế.
        </p>
        <p>
          Bạn tự chịu trách nhiệm khi tập. Nếu thấy đau, chóng mặt hoặc khó chịu bất thường, hãy
          dừng lại và hỏi ý kiến bác sĩ.
        </p>
        <p className="text-[var(--color-text-muted)]">
          Phần chấm form qua video chạy bằng máy, có thể sai. Luôn có nút báo "góp ý này sai".
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        Tôi đã đọc và đồng ý
      </label>
      <Button className="w-full" onClick={onAccept} disabled={!checked || pending}>
        {pending ? "Đang lưu…" : "Tiếp tục"}
      </Button>
    </div>
  )
}

function BodyStep({
  profile,
  pending,
  onSubmit,
}: {
  profile: {
    birthYear: number | null
    gender: string | null
    latestBodyMetric: { heightCm: number | null; weightKg: number | null } | null
  }
  pending: boolean
  onSubmit: (v: {
    birthYear?: number
    gender: string
    heightCm: number | null
    weightKg: number | null
  }) => void
}) {
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? "")
  const [gender, setGender] = useState(profile.gender ?? "")
  const [heightCm, setHeightCm] = useState(profile.latestBodyMetric?.heightCm?.toString() ?? "")
  const [weightKg, setWeightKg] = useState(profile.latestBodyMetric?.weightKg?.toString() ?? "")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Năm sinh" htmlFor="birthYear">
          <Input
            id="birthYear"
            type="number"
            className="num"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
          />
        </Field>
        <Field label="Giới tính (tuỳ chọn)" htmlFor="gender">
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[15px]"
          >
            <option value="">Không muốn nói</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chiều cao (cm)" htmlFor="heightCm">
          <Input
            id="heightCm"
            type="number"
            step="0.5"
            className="num"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </Field>
        <Field label="Cân nặng (kg)" htmlFor="weightKg">
          <Input
            id="weightKg"
            type="number"
            step="0.1"
            className="num"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </Field>
      </div>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          onSubmit({
            birthYear: birthYear ? Number(birthYear) : undefined,
            gender,
            heightCm: heightCm ? Number(heightCm) : null,
            weightKg: weightKg ? Number(weightKg) : null,
          })
        }
      >
        {pending ? "Đang lưu…" : "Tiếp tục"}
      </Button>
    </div>
  )
}

function ChoiceStep({
  options,
  value,
  pending,
  onSubmit,
}: {
  options: readonly { value: string; label: string }[]
  value: string | null
  pending: boolean
  onSubmit: (value: string) => void
}) {
  const [selected, setSelected] = useState(value ?? "")
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((o) => (
          <OptionRow
            key={o.value}
            type="radio"
            name="choice"
            label={o.label}
            checked={selected === o.value}
            onChange={() => setSelected(o.value)}
          />
        ))}
      </div>
      <Button className="w-full" disabled={!selected || pending} onClick={() => onSubmit(selected)}>
        {pending ? "Đang lưu…" : "Tiếp tục"}
      </Button>
    </div>
  )
}

function EquipmentStep({
  value,
  pending,
  onSubmit,
}: {
  value: string[]
  pending: boolean
  onSubmit: (equipment: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(value)
  function toggle(item: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, item] : prev.filter((v) => v !== item)))
  }
  return (
    <div className="space-y-4">
      <div className="kicker">Thiết bị sẵn có</div>
      <div className="space-y-2">
        {EQUIPMENT_OPTIONS.map((eq) => (
          <OptionRow
            key={eq.value}
            type="checkbox"
            name="equipment"
            label={eq.label}
            checked={selected.includes(eq.value)}
            onChange={(checked) => toggle(eq.value, checked)}
          />
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-[var(--color-danger)]">Chọn ít nhất một thiết bị.</p>
      )}
      <Button
        className="w-full"
        disabled={selected.length === 0 || pending}
        onClick={() => onSubmit(selected)}
      >
        {pending ? "Đang lưu…" : "Tiếp tục"}
      </Button>
    </div>
  )
}

function ExperienceStep({
  profile,
  pending,
  onSubmit,
}: {
  profile: { experience: string | null; sessionsPerWeek: number | null }
  pending: boolean
  onSubmit: (experience: string, sessionsPerWeek: number) => void
}) {
  const [experience, setExperience] = useState(profile.experience ?? "")
  const [sessions, setSessions] = useState(profile.sessionsPerWeek ?? 3)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {EXPERIENCE_LEVELS.map((e) => (
          <OptionRow
            key={e.value}
            type="radio"
            name="experience"
            label={e.label}
            checked={experience === e.value}
            onChange={() => setExperience(e.value)}
          />
        ))}
      </div>
      <Field label="Số buổi mỗi tuần (2–6)" htmlFor="sessionsPerWeek">
        <Input
          id="sessionsPerWeek"
          type="number"
          min={2}
          max={6}
          className="num w-24"
          value={sessions}
          onChange={(e) => setSessions(Number(e.target.value))}
        />
      </Field>
      <Button
        className="w-full"
        disabled={!experience || sessions < 2 || sessions > 6 || pending}
        onClick={() => onSubmit(experience, sessions)}
      >
        {pending ? "Đang lưu…" : "Xong, chọn chương trình"}
      </Button>
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
