import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { HelpButton, HelpText, useHelp } from "@/features/admin/components/HelpButton"
import { TemplateDaysEditor } from "@/features/admin/components/TemplateDaysEditor"
import { IncrementEditor } from "@/features/admin/components/IncrementEditor"
import { ProgressionRulesEditor } from "@/features/admin/components/ProgressionRulesEditor"
import { useDuplicateTemplate, useSaveTemplate } from "@/features/admin/api/useTemplates"
import type { ProgramTemplate, ProgramTemplateInput } from "@/features/admin/types"
import { templateSchema } from "@/features/admin/types/templateSchema"
import { emptyTemplate, loadedSlugs, missingIncrements, pruneIncrements, toInput } from "@/features/admin/utils/templateForm"
import { TEMPLATE_HELP, type TemplateHelpKey } from "@/features/admin/utils/templateHelp"
import { useExercises } from "@/features/exercise/api/useExercises"
import { EQUIPMENT_OPTIONS } from "@/features/profile/types"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const INPUT =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"

/**
 * Form template (doc/design-template-admin-v1.md §6, mockup doc/mockup-template-admin/demo.html).
 * Trang gắn key = id nên đổi template là dựng form mới, không mang giá trị cũ sang.
 * renderPreview: khung "Thử quy tắc" (Task 8) nhận giá trị form đang sửa và báo thẻ quy tắc đã quyết định.
 */
export function TemplateEditor({
  id,
  template,
  renderPreview,
}: {
  id: string | null
  template: ProgramTemplate | null
  renderPreview?: (onHit: (n: 1 | 2 | 3 | 4 | null) => void, nameOf: (slug: string) => string, needsLoad: (slug: string) => boolean) => ReactNode
}) {
  const navigate = useNavigate()
  const save = useSaveTemplate(id ?? undefined)
  const duplicate = useDuplicateTemplate()
  const exercises = useExercises()
  const help = useHelp<TemplateHelpKey>()
  const confirmRef = useRef<HTMLDialogElement>(null)
  const pending = useRef<ProgramTemplateInput | null>(null)
  const [hit, setHit] = useState<1 | 2 | 3 | 4 | null>(null)
  const [tried, setTried] = useState(false)

  const form = useForm<ProgramTemplateInput>({
    resolver: zodResolver(templateSchema),
    mode: "onChange",
    defaultValues: template ? toInput(template) : emptyTemplate(),
  })
  const days = useWatch({ control: form.control, name: "days" })
  const equipment = useWatch({ control: form.control, name: "requiredEquipment" })
  const active = useWatch({ control: form.control, name: "active" })
  const incrementKg = useWatch({ control: form.control, name: "progression.incrementKg" })

  // Backend đếm dụng cụ trên mọi bài, kể cả bài đã tắt, nên tra theo toàn bộ danh sách.
  const catalog = exercises.data ?? []
  const ready = exercises.data !== undefined
  const bySlug = new Map(catalog.map((e) => [e.slug, e]))
  const needsLoad = (slug: string) => (bySlug.get(slug)?.equipment.length ?? 0) > 0
  const nameOf = (slug: string) => {
    const e = bySlug.get(slug)
    return e ? (e.nameVi ?? e.nameEn) : slug
  }
  const slugs = loadedSlugs(days ?? [], needsLoad)
  const activeUsers = template?.activeUsers ?? 0
  const missing = ready ? missingIncrements(slugs, incrementKg ?? {}) : []
  const blocked = tried && missing.length > 0 ? `Chọn bước tăng tạ cho: ${missing.map(nameOf).join(", ")}.` : null

  // Bài bị xoá hay đổi thì bỏ bước tăng của nó: khoá cũ mà sai số sẽ chặn lưu không rõ vì sao.
  // Chỉ chạy khi danh sách bài đã tải, lúc chưa tải mọi bài đều "không cần tạ".
  const slugKey = slugs.join(",")
  useEffect(() => {
    if (!ready) return
    const current = form.getValues("progression.incrementKg")
    const pruned = pruneIncrements(current, slugKey ? slugKey.split(",") : [])
    if (pruned !== current) form.setValue("progression.incrementKg", pruned, { shouldDirty: true, shouldValidate: true })
  }, [ready, slugKey, form])

  function doSave(values: ProgramTemplateInput) {
    save.mutate(values, {
      onSuccess: (result) => {
        if (!id) navigate(`/admin/templates/${result.id}`, { replace: true })
        else form.reset(values)
      },
    })
  }

  function onSubmit(values: ProgramTemplateInput) {
    setTried(true)
    if (missingIncrements(loadedSlugs(values.days, needsLoad), values.progression.incrementKg).length) return
    // Quy tắc tăng tạ áp ngay cho người đang tập — hỏi lại trước khi lưu.
    if (activeUsers > 0) {
      pending.current = values
      confirmRef.current?.showModal()
      return
    }
    doSave(values)
  }

  const section = (title: string, key: TemplateHelpKey, extra?: ReactNode) => (
    <>
      <div className="mt-7 flex items-center text-base font-extrabold">
        {title}
        {extra}
        <HelpButton open={help.isOpen(key)} onClick={() => help.toggle(key)} />
      </div>
      {help.isOpen(key) && <HelpText lines={TEMPLATE_HELP[key]} className="mt-2" />}
    </>
  )
  const errors = form.formState.errors
  const invalid = form.formState.submitCount > 0 && !form.formState.isValid
  // oxlint-disable-next-line react/refs -- onSubmit chỉ đụng ref lúc submit, không phải lúc render
  const submit = form.handleSubmit(onSubmit)

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Cấu hình · template" title={id ? (template?.name ?? "") : "Template mới"}>
          {id && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={duplicate.isPending}
              onClick={() =>
                duplicate.mutate(id, { onSuccess: (copy) => navigate(`/admin/templates/${copy.id}`) })
              }
            >
              Nhân bản
            </Button>
          )}
          <Button type="submit" size="sm" disabled={save.isPending || !ready}>
            {save.isPending ? "Đang lưu…" : "Lưu template"}
          </Button>
        </AdminHeader>

        {(blocked || invalid || save.isError || duplicate.isError) && (
          <div role="alert" className="space-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-2.5 text-sm text-[var(--color-danger)]">
            {blocked && <p>{blocked}</p>}
            {invalid && <p>Còn ô chưa hợp lệ, xem các dòng báo đỏ bên dưới.</p>}
            {save.isError && <p>{save.error.message}</p>}
            {duplicate.isError && <p>{duplicate.error.message}</p>}
          </div>
        )}

        <div className="overflow-auto px-7 py-5 pb-16">
          <div className="max-w-[900px]">
            {activeUsers > 0 && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-warn-tint)] px-3 py-2.5 text-[13px]">
                <b className="text-[var(--color-warn)]">{activeUsers} người đang dùng.</b> Sửa bước tăng tạ hay quy tắc sẽ áp ngay từ buổi tới của họ.
              </p>
            )}

            <div className="mt-4 flex items-center">
              <input {...form.register("name")} placeholder="Tên template, vd: Full Body 3 buổi" aria-label="Tên template" className={cn(INPUT, "h-11 text-lg font-bold")} />
              <HelpButton open={help.isOpen("name")} onClick={() => help.toggle("name")} />
            </div>
            {help.isOpen("name") && <HelpText lines={TEMPLATE_HELP.name} className="mt-2" />}
            {errors.name && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.name.message}</p>}

            {section("Thông tin", "desc")}
            <div className="mt-3 grid grid-cols-[150px_1fr] items-center gap-3">
              <span className="text-[13px] text-[var(--color-text-muted)]">Mô tả</span>
              <textarea {...form.register("methodology")} rows={2} aria-label="Mô tả" className={INPUT} />

              <span className="flex items-center text-[13px] text-[var(--color-text-muted)]">
                Số buổi / tuần
                <HelpButton open={help.isOpen("sess")} onClick={() => help.toggle("sess")} />
              </span>
              <div className="flex items-center gap-2 text-sm">
                từ <input {...form.register("sessionsMin", { valueAsNumber: true })} inputMode="numeric" aria-label="Số buổi tối thiểu" className={cn(INPUT, "num w-16 text-right font-bold")} />
                đến <input {...form.register("sessionsMax", { valueAsNumber: true })} inputMode="numeric" aria-label="Số buổi tối đa" className={cn(INPUT, "num w-16 text-right font-bold")} />
                {(errors.sessionsMin || errors.sessionsMax) && (
                  <span className="text-xs text-[var(--color-danger)]">{(errors.sessionsMin ?? errors.sessionsMax)?.message}</span>
                )}
              </div>
              {help.isOpen("sess") && <HelpText lines={TEMPLATE_HELP.sess} className="col-span-2" />}

              <span className="flex items-center text-[13px] text-[var(--color-text-muted)]">
                Cần thiết bị
                <HelpButton open={help.isOpen("equip")} onClick={() => help.toggle("equip")} />
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_OPTIONS.map((o) => {
                  const on = equipment?.includes(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        form.setValue(
                          "requiredEquipment",
                          on ? (equipment ?? []).filter((v) => v !== o.value) : [...(equipment ?? []), o.value],
                          { shouldDirty: true },
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px]",
                        on ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]" : "border-[var(--color-border)]",
                        FOCUS,
                      )}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {help.isOpen("equip") && <HelpText lines={TEMPLATE_HELP.equip} className="col-span-2" />}

              <span className="text-[13px] text-[var(--color-text-muted)]">Trạng thái</span>
              <div className="flex gap-1.5">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={active === v}
                    onClick={() => form.setValue("active", v, { shouldDirty: true })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px]",
                      active === v ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]" : "border-[var(--color-border)]",
                      FOCUS,
                    )}
                  >
                    {v ? "Đang bật" : "Tắt — người tập không thấy"}
                  </button>
                ))}
              </div>
            </div>

            {section("Các buổi", "days", <small className="ml-2 text-xs font-medium text-[var(--color-text-muted)]">{days?.length ?? 0} buổi luân phiên</small>)}
            {(errors.days?.message ?? errors.days?.root?.message) && (
              <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.days?.message ?? errors.days?.root?.message}</p>
            )}
            <div className="mt-3">
              {ready ? (
                <TemplateDaysEditor catalog={catalog} />
              ) : exercises.isError ? (
                <p className="text-sm text-[var(--color-danger)]">{exercises.error.message}</p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Đang tải danh sách bài…</p>
              )}
            </div>

            {section("Bước tăng tạ", "inc")}
            <div className="mt-2">
              {ready ? (
                <IncrementEditor slugs={slugs} nameOf={nameOf} />
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Đang tải danh sách bài…</p>
              )}
            </div>

            {section("Quy tắc tăng tạ", "rules")}
            <ProgressionRulesEditor hit={hit} />

            {renderPreview && (
              <>
                {section("Thử quy tắc", "sim")}
                {renderPreview(setHit, nameOf, needsLoad)}
              </>
            )}

          </div>
        </div>

        <dialog
          ref={confirmRef}
          aria-labelledby="confirm-title"
          className="m-auto w-[440px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] backdrop:bg-black/60"
        >
          <h3 id="confirm-title" className="text-[17px] font-bold">
            {activeUsers} người đang dùng “{template?.name}”
          </h3>
          <ul className="mt-2.5 ml-4.5 list-disc text-sm leading-relaxed text-[var(--color-text-muted)]">
            <li><b className="text-[var(--color-text)]">Bước tăng tạ và quy tắc</b> áp ngay từ buổi tới của họ.</li>
            <li><b className="text-[var(--color-text)]">Buổi, bài, set, rep</b> chỉ áp cho người chọn template sau này. Lịch đã sinh của người đang tập giữ nguyên.</li>
          </ul>
          <div className="mt-4.5 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => confirmRef.current?.close()}>Huỷ</Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                confirmRef.current?.close()
                if (pending.current) doSave(pending.current)
              }}
            >
              Vẫn lưu
            </Button>
          </div>
        </dialog>
      </form>
    </FormProvider>
  )
}
