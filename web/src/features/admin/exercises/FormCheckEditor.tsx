import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { FormCheck, FormCheckInput } from "./types"
import { useDeactivateFormCheck, useFormChecks, useSaveFormCheck } from "./useExercises"

/**
 * P7 ke-hoach-ky-thuat-v1.md: ngưỡng + text + góc hợp lệ ở đây, sửa không
 * cần deploy. F4 concept-frontend-v1.md: thresholds là JSON thô trong
 * textarea, chưa dựng form riêng cho từng dạng ngưỡng.
 */
export function FormCheckEditor({ exerciseId }: { exerciseId: string }) {
  const formChecks = useFormChecks(exerciseId)
  const deactivate = useDeactivateFormCheck(exerciseId)
  const [editing, setEditing] = useState<FormCheck | "new" | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Form checks</Label>
        <Button type="button" variant="secondary" onClick={() => setEditing("new")}>
          + Thêm check
        </Button>
      </div>

      {formChecks.data?.map((check) => (
        <Card key={check.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {check.code} <span className="text-[var(--color-text-muted)]">· ưu tiên {check.priority}</span>
              {!check.active && <span className="text-[var(--color-text-muted)]"> · đã tắt</span>}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(check)}>
                Sửa
              </Button>
              {check.active && (
                <Button type="button" variant="ghost" onClick={() => deactivate.mutate(check.id)}>
                  Tắt
                </Button>
              )}
            </div>
          </div>
          <p className="num text-xs text-[var(--color-text-muted)]">{check.thresholds}</p>
        </Card>
      ))}

      {editing && (
        <FormCheckForm
          exerciseId={exerciseId}
          check={editing === "new" ? undefined : editing}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function FormCheckForm({
  exerciseId,
  check,
  onDone,
}: {
  exerciseId: string
  check?: FormCheck
  onDone: () => void
}) {
  const save = useSaveFormCheck(exerciseId, check?.id)
  const { register, handleSubmit } = useForm<
    FormCheckInput & { validViewpointsText: string }
  >({
    defaultValues: {
      code: check?.code ?? "",
      metric: check?.metric ?? "",
      validViewpointsText: check?.validViewpoints.join(", ") ?? "",
      thresholds: check?.thresholds ?? '{"pass_below": 1.0}',
      confidenceMin: check?.confidenceMin ?? 0.7,
      cuePassVi: check?.cuePassVi ?? "",
      cueWarnVi: check?.cueWarnVi ?? "",
      cueFailVi: check?.cueFailVi ?? "",
      priority: check?.priority ?? 1,
      active: check?.active ?? true,
    },
  })

  function onSubmit(values: FormCheckInput & { validViewpointsText: string }) {
    const { validViewpointsText, ...rest } = values
    save.mutate(
      {
        ...rest,
        confidenceMin: Number(values.confidenceMin),
        priority: Number(values.priority),
        validViewpoints: validViewpointsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {!check && (
          <div className="space-y-1">
            <Label htmlFor="code">code</Label>
            <Input id="code" placeholder="depth" {...register("code")} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="metric">metric</Label>
          <Input id="metric" placeholder="hip_depth_ratio" {...register("metric")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="validViewpointsText">Góc hợp lệ (phẩy)</Label>
          <Input id="validViewpointsText" placeholder="SAGITTAL, FRONTAL" {...register("validViewpointsText")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confidenceMin">confidence_min</Label>
          <Input id="confidenceMin" type="number" step="0.01" className="num" {...register("confidenceMin")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority">Thứ tự ưu tiên</Label>
          <Input id="priority" type="number" className="num" {...register("priority")} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="thresholds">thresholds (JSON thô)</Label>
        <Textarea id="thresholds" rows={2} {...register("thresholds")} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cuePassVi">Text khi đạt</Label>
          <Input id="cuePassVi" {...register("cuePassVi")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cueWarnVi">Text khi sát ngưỡng</Label>
          <Input id="cueWarnVi" {...register("cueWarnVi")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cueFailVi">Text khi không đạt</Label>
          <Input id="cueFailVi" {...register("cueFailVi")} />
        </div>
      </div>

      {save.isError && <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          Lưu check
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}
