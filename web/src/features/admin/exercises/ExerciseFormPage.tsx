import { useNavigate, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormCheckEditor } from "./FormCheckEditor"
import type { ExerciseInput } from "./types"
import { useExercise, useSaveExercise } from "./useExercises"

/** concept-frontend-v1.md màn 12. slug bất biến sau khi tạo — không sửa được ở form edit. */
export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === "new"
  const navigate = useNavigate()
  const existing = useExercise(isNew ? "" : id!)
  const save = useSaveExercise(isNew ? undefined : id)

  const { register, handleSubmit, reset } = useForm<
    ExerciseInput & { muscleGroupsText: string; equipmentText: string }
  >({
    values: existing.data
      ? {
          slug: existing.data.slug,
          nameEn: existing.data.nameEn,
          nameVi: existing.data.nameVi ?? "",
          muscleGroupsText: existing.data.muscleGroups.join(", "),
          equipmentText: existing.data.equipment.join(", "),
          muscleGroups: existing.data.muscleGroups,
          equipment: existing.data.equipment,
          description: existing.data.description ?? "",
          analyzable: existing.data.analyzable,
          active: existing.data.active,
        }
      : undefined,
  })

  function onSubmit(values: ExerciseInput & { muscleGroupsText: string; equipmentText: string }) {
    const { muscleGroupsText, equipmentText, ...rest } = values
    const toList = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean)
    save.mutate(
      { ...rest, muscleGroups: toList(muscleGroupsText), equipment: toList(equipmentText) },
      {
        onSuccess: (result) => {
          if (isNew) navigate(`/admin/exercises/${result.id}`, { replace: true })
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
      <h1 className="text-lg font-semibold">{isNew ? "Bài tập mới" : "Sửa bài tập"}</h1>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isNew && (
            <div className="space-y-1">
              <Label htmlFor="slug">slug</Label>
              <Input id="slug" placeholder="goblet-squat" {...register("slug")} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nameEn">Tên (EN)</Label>
              <Input id="nameEn" {...register("nameEn")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nameVi">Tên (VI)</Label>
              <Input id="nameVi" {...register("nameVi")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="muscleGroupsText">Nhóm cơ (phẩy)</Label>
              <Input id="muscleGroupsText" placeholder="QUADS, GLUTES" {...register("muscleGroupsText")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="equipmentText">Thiết bị (phẩy, rỗng = bodyweight)</Label>
              <Input id="equipmentText" placeholder="BARBELL_RACK" {...register("equipmentText")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register("analyzable")} /> Chấm form được (TN2)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register("active")} /> Đang hoạt động
            </label>
          </div>

          {save.isError && <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p>}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </form>
      </Card>

      {!isNew && id && <FormCheckEditor exerciseId={id} />}
    </div>
  )
}
