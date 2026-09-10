import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"
import type { FormCheck, FormCheckInput } from "./types"
import { useDeactivateFormCheck, useFormChecks, useSaveFormCheck } from "./useExercises"

/**
 * P7 ke-hoach-ky-thuat-v1.md: ngưỡng + text + góc hợp lệ ở đây, sửa không
 * cần deploy. F4 concept-frontend-v1.md: thresholds là JSON thô trong
 * textarea, chưa dựng form riêng cho từng dạng ngưỡng.
 *
 * Design để mỗi mục kiểm là một thẻ mở/thu được: mục đang sửa mở ra hết cỡ,
 * mục còn lại thu thành một dòng. Vòng lặp "chỉnh ngưỡng → đối chiếu" chỉ động
 * tới một mục mỗi lần.
 */
export function FormCheckEditor({ exerciseId }: { exerciseId: string }) {
  const formChecks = useFormChecks(exerciseId)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const checks = formChecks.data ?? []

  return (
    <div className="max-w-3xl">
      {formChecks.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
      {formChecks.isError && (
        <p className="text-sm text-[var(--color-danger)]">{formChecks.error.message}</p>
      )}
      {formChecks.data && checks.length === 0 && !adding && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Bài này chưa có mục kiểm nào. Thêm mục kiểm thì bài mới chấm form được.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {checks.map((check, i) => (
          <CheckCard
            key={check.id}
            exerciseId={exerciseId}
            check={check}
            index={i + 1}
            open={openId === check.id}
            onToggle={() => setOpenId(openId === check.id ? null : check.id)}
          />
        ))}

        {adding && (
          <div className="rounded-xl border-l-[3px] border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
            <div className="text-base font-bold">Mục kiểm mới</div>
            <CheckForm exerciseId={exerciseId} onDone={() => setAdding(false)} />
          </div>
        )}
      </div>

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 h-[38px] rounded-lg border border-dashed border-[var(--color-border)] px-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          + Thêm mục kiểm
        </button>
      )}
    </div>
  )
}

function CheckCard({
  exerciseId,
  check,
  index,
  open,
  onToggle,
}: {
  exerciseId: string
  check: FormCheck
  index: number
  open: boolean
  onToggle: () => void
}) {
  const deactivate = useDeactivateFormCheck(exerciseId)

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-4 py-3.5">
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-base font-semibold",
              check.active ? "" : "text-[var(--color-text-muted)]",
            )}
          >
            {index} · {check.code}
          </div>
          <div className="num mt-0.5 text-xs text-[var(--color-text-muted)]">
            ưu tiên {check.priority} · confidence_min {check.confidenceMin}
            {!check.active && " · đã tắt"}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-[var(--color-accent)]"
        >
          Mở ra
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-l-[3px] border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold">
          {index} · {check.code}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="num rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]">
            ưu tiên {check.priority}
          </span>
          {check.active && (
            <button
              type="button"
              onClick={() => deactivate.mutate(check.id)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
            >
              Tắt
            </button>
          )}
          <button type="button" onClick={onToggle} className="text-xs text-[var(--color-text-muted)]">
            Thu gọn
          </button>
        </div>
      </div>
      <CheckForm exerciseId={exerciseId} check={check} onDone={onToggle} />
    </div>
  )
}

function CheckForm({
  exerciseId,
  check,
  onDone,
}: {
  exerciseId: string
  check?: FormCheck
  onDone: () => void
}) {
  const save = useSaveFormCheck(exerciseId, check?.id)
  const { register, handleSubmit } = useForm<FormCheckInput & { validViewpointsText: string }>({
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3.5 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {!check && (
          <Field label="code" htmlFor="code">
            <Input id="code" placeholder="depth" {...register("code")} />
          </Field>
        )}
        <Field label="metric" htmlFor="metric">
          <Input id="metric" placeholder="hip_depth_ratio" {...register("metric")} />
        </Field>
        <Field label="Góc quay hợp lệ (phẩy)" htmlFor="validViewpointsText">
          <Input
            id="validViewpointsText"
            placeholder="SAGITTAL, FRONTAL"
            {...register("validViewpointsText")}
          />
        </Field>
        <Field label="confidence_min" htmlFor="confidenceMin">
          <Input
            id="confidenceMin"
            type="number"
            step="0.01"
            className="num"
            {...register("confidenceMin")}
          />
        </Field>
        <Field label="Thứ tự ưu tiên" htmlFor="priority">
          <Input id="priority" type="number" className="num" {...register("priority")} />
        </Field>
      </div>

      <Field label="thresholds (JSON thô)" htmlFor="thresholds">
        <Textarea id="thresholds" rows={2} {...register("thresholds")} />
      </Field>

      <Field label="Text góp ý khi KHÔNG ĐẠT" htmlFor="cueFailVi">
        <Textarea id="cueFailVi" rows={2} {...register("cueFailVi")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Text khi đạt" htmlFor="cuePassVi">
          <Input id="cuePassVi" {...register("cuePassVi")} />
        </Field>
        <Field label="Text khi sát ngưỡng" htmlFor="cueWarnVi">
          <Input id="cueWarnVi" {...register("cueWarnVi")} />
        </Field>
      </div>

      {save.isError && <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p>}

      <div className="flex gap-2.5">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? "Đang lưu…" : "Lưu mục kiểm"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
      </div>
    </form>
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
