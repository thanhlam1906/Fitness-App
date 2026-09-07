import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCurrentUser } from "@/auth/CurrentUserContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVELS,
  GOALS,
  onboardingSchema,
  type OnboardingFormValues,
} from "./schema"
import { useSaveOnboarding } from "./useSaveOnboarding"

/**
 * concept-frontend-v1.md màn 2 (Onboarding), thu hẹp về đúng field
 * OnboardingRequest backend đang nhận: goal, experience, sessionsPerWeek,
 * equipment. Disclaimer / body metrics / mức tạ khởi điểm chưa có API —
 * mức tạ khởi điểm nhập ở màn Chọn chương trình (đi kèm POST /programs).
 */
export function OnboardingPage() {
  const { userId } = useCurrentUser()
  const navigate = useNavigate()
  const saveOnboarding = useSaveOnboarding(userId!)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { sessionsPerWeek: 3, equipment: [] },
  })

  const selectedEquipment = watch("equipment")

  function toggleEquipment(value: string, checked: boolean) {
    const next = checked
      ? [...selectedEquipment, value]
      : selectedEquipment.filter((v) => v !== value)
    setValue("equipment", next, { shouldValidate: true })
  }

  function onSubmit(values: OnboardingFormValues) {
    saveOnboarding.mutate(values, {
      onSuccess: () => navigate("/program"),
    })
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Thiết lập hồ sơ tập luyện</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Dùng để đề xuất chương trình phù hợp.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset className="space-y-2">
          <Label>Mục tiêu</Label>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <label
                key={g.value}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm has-[:checked]:border-[var(--color-accent)]"
              >
                <input type="radio" value={g.value} {...register("goal")} />
                {g.label}
              </label>
            ))}
          </div>
          {errors.goal && <p className="text-xs text-[var(--color-danger)]">Chọn một mục tiêu</p>}
        </fieldset>

        <fieldset className="space-y-2">
          <Label>Kinh nghiệm</Label>
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_LEVELS.map((e) => (
              <label
                key={e.value}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm has-[:checked]:border-[var(--color-accent)]"
              >
                <input type="radio" value={e.value} {...register("experience")} />
                {e.label}
              </label>
            ))}
          </div>
          {errors.experience && (
            <p className="text-xs text-[var(--color-danger)]">Chọn mức kinh nghiệm</p>
          )}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="sessionsPerWeek">Số buổi mỗi tuần (2–6)</Label>
          <input
            id="sessionsPerWeek"
            type="number"
            min={2}
            max={6}
            className="num w-24 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
            {...register("sessionsPerWeek", { valueAsNumber: true })}
          />
        </div>

        <fieldset className="space-y-2">
          <Label>Thiết bị có sẵn</Label>
          <div className="space-y-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <label key={eq.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedEquipment?.includes(eq.value) ?? false}
                  onChange={(e) => toggleEquipment(eq.value, e.target.checked)}
                />
                {eq.label}
              </label>
            ))}
          </div>
          {errors.equipment && (
            <p className="text-xs text-[var(--color-danger)]">{errors.equipment.message}</p>
          )}
        </fieldset>

        {saveOnboarding.isError && (
          <p className="text-sm text-[var(--color-danger)]">
            Lưu thất bại: {saveOnboarding.error.message}
          </p>
        )}

        <Button type="submit" disabled={saveOnboarding.isPending}>
          {saveOnboarding.isPending ? "Đang lưu…" : "Tiếp tục"}
        </Button>
      </form>
    </Card>
  )
}
