import { Link } from "react-router"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProgramSchema, WEEKDAYS, type CreateProgramFormValues } from "./schema"
import { useCandidates } from "./useCandidates"
import { useCreateProgram } from "./useCreateProgram"

/**
 * concept-frontend-v1.md màn 3 (Chọn chương trình). "Xem cấu trúc tuần"
 * chưa làm được — backend chưa có endpoint trả week_structure của template
 * (chỉ có candidates: id/slug/name/methodology). Mức tạ khởi điểm nhập tay
 * theo slug vì cùng lý do — chưa có endpoint liệt kê bài của một template.
 */
export function ProgramSelectionPage() {
  const candidates = useCandidates()
  const createProgram = useCreateProgram()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProgramFormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      templateId: "",
      startingLoads: [],
      restDays: [6, 7],
      startDate: new Date().toISOString().slice(0, 10),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "startingLoads" })
  const selectedRestDays = watch("restDays")

  function toggleRestDay(day: number, checked: boolean) {
    setValue(
      "restDays",
      checked ? [...selectedRestDays, day] : selectedRestDays.filter((d) => d !== day),
      { shouldValidate: true },
    )
  }

  function onSubmit(values: CreateProgramFormValues) {
    createProgram.mutate(values)
  }

  if (createProgram.isSuccess) {
    return (
      <Card className="space-y-3">
        <h1 className="text-lg font-semibold text-[var(--color-success)]">Đã tạo chương trình</h1>
        <Link to="/schedule">
          <Button>Xem lịch tập</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Chọn chương trình</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Đề xuất theo số buổi/tuần và thiết bị đã khai ở bước trước.
        </p>
      </div>

      {candidates.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}

      {candidates.isError && (
        <p className="text-sm text-[var(--color-danger)]">
          Không tải được đề xuất: {candidates.error.message}
        </p>
      )}

      {candidates.data?.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Không có chương trình nào khớp — kiểm tra lại thiết bị/số buổi ở bước onboarding.
        </p>
      )}

      {candidates.data && candidates.data.length > 0 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <fieldset className="space-y-2">
            <Label>Chương trình đề xuất</Label>
            <div className="space-y-2">
              {candidates.data.map((c) => (
                <label
                  key={c.id}
                  className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 has-[:checked]:border-[var(--color-accent)]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <input type="radio" value={c.id} {...register("templateId")} />
                    {c.name}
                  </span>
                  {c.methodology && (
                    <span className="pl-6 text-xs text-[var(--color-text-muted)]">
                      {c.methodology}
                    </span>
                  )}
                </label>
              ))}
            </div>
            {errors.templateId && (
              <p className="text-xs text-[var(--color-danger)]">{errors.templateId.message}</p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <Label>Ngày nghỉ trong tuần</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-sm has-[:checked]:border-[var(--color-accent)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedRestDays.includes(d.value)}
                    onChange={(e) => toggleRestDay(d.value, e.target.checked)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="startDate">Ngày bắt đầu</Label>
            <input
              id="startDate"
              type="date"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              {...register("startDate")}
            />
          </div>

          <fieldset className="space-y-2">
            <Label>Mức tạ khởi điểm (tuỳ chọn)</Label>
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`slug-${i}`}>Tên bài (slug)</Label>
                  <Input
                    id={`slug-${i}`}
                    placeholder="barbell-back-squat"
                    {...register(`startingLoads.${i}.slug`)}
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`kg-${i}`}>Tải (kg)</Label>
                  <Input
                    id={`kg-${i}`}
                    type="number"
                    step="0.5"
                    className="num"
                    {...register(`startingLoads.${i}.kg`, { valueAsNumber: true })}
                  />
                </div>
                <Button type="button" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ slug: "", kg: 0 })}
            >
              <Plus size={16} /> Thêm bài
            </Button>
          </fieldset>

          {createProgram.isError && (
            <p className="text-sm text-[var(--color-danger)]">
              Tạo chương trình thất bại: {createProgram.error.message}
            </p>
          )}

          <Button type="submit" disabled={createProgram.isPending}>
            {createProgram.isPending ? "Đang tạo…" : "Tạo chương trình"}
          </Button>
        </form>
      )}
    </Card>
  )
}
