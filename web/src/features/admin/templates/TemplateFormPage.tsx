import { useNavigate, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ProgramTemplateInput } from "./types"
import { useSaveTemplate, useTemplate } from "./useTemplates"

/**
 * concept-frontend-v1.md màn 12 + F4: weekStructure/progression là JSON thô
 * trong textarea, chưa dựng form kéo-thả bài/set/rep riêng.
 */
export function TemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === "new"
  const navigate = useNavigate()
  const existing = useTemplate(isNew ? "" : id!)
  const save = useSaveTemplate(isNew ? undefined : id)

  const { register, handleSubmit, reset } = useForm<
    ProgramTemplateInput & { requiredEquipmentText: string }
  >({
    values: existing.data
      ? {
          slug: existing.data.slug,
          name: existing.data.name,
          methodology: existing.data.methodology ?? "",
          sessionsMin: existing.data.sessionsMin,
          sessionsMax: existing.data.sessionsMax,
          requiredEquipmentText: existing.data.requiredEquipment.join(", "),
          requiredEquipment: existing.data.requiredEquipment,
          weekStructure: existing.data.weekStructure,
          progression: existing.data.progression,
          active: existing.data.active,
        }
      : undefined,
  })

  function onSubmit(values: ProgramTemplateInput & { requiredEquipmentText: string }) {
    const { requiredEquipmentText, ...rest } = values
    save.mutate(
      {
        ...rest,
        sessionsMin: Number(values.sessionsMin),
        sessionsMax: Number(values.sessionsMax),
        requiredEquipment: requiredEquipmentText.split(",").map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: (result) => {
          if (isNew) navigate(`/admin/templates/${result.id}`, { replace: true })
          else reset()
        },
      },
    )
  }

  if (!isNew && existing.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{isNew ? "Template mới" : "Sửa template"}</h1>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isNew && (
            <div className="space-y-1">
              <Label htmlFor="slug">slug</Label>
              <Input id="slug" placeholder="starting-strength" {...register("slug")} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Tên</Label>
              <Input id="name" {...register("name")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="requiredEquipmentText">Thiết bị bắt buộc (phẩy)</Label>
              <Input id="requiredEquipmentText" placeholder="BARBELL_RACK" {...register("requiredEquipmentText")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sessionsMin">Số buổi/tuần — tối thiểu</Label>
              <Input id="sessionsMin" type="number" className="num" {...register("sessionsMin")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sessionsMax">Số buổi/tuần — tối đa</Label>
              <Input id="sessionsMax" type="number" className="num" {...register("sessionsMax")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="methodology">Mô tả phương pháp</Label>
            <Textarea id="methodology" rows={2} {...register("methodology")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="weekStructure">week_structure (JSON thô)</Label>
            <Textarea id="weekStructure" rows={8} {...register("weekStructure")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="progression">progression (JSON thô)</Label>
            <Textarea id="progression" rows={3} {...register("progression")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("active")} /> Đang hoạt động
          </label>

          {save.isError && <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p>}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
