import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"
import { MEASURES, MOMENT_NAME, measuresFor, type Moment, type ViewCode } from "@/lib/formMeasures"
import type { FormCheck } from "@/features/exercise/types"
import { useDeactivateFormCheck, useSaveFormCheck } from "@/features/exercise/api/useExercises"
import { HelpButton, HelpText, useHelp } from "@/features/admin/components/HelpButton"
import { MeasureFigure } from "@/features/admin/components/MeasureFigure"
import { RangeBar } from "@/features/admin/components/RangeBar"
import { draftOf, emptyDraft, rangeOf, toInput, validateDraft, type Draft } from "@/features/admin/utils/formCheckDraft"
import type { HelpKey } from "@/features/admin/utils/formCheckHelp"

const MOMENTS: Moment[] = ["START", "PEAK"]

/** Sửa hoặc thêm MỘT khớp cần kiểm (mockup doc/mockup-form-check-admin/demo.html). Lưu ngay khi bấm Xong. */
export function FormCheckForm({
  exerciseId,
  view,
  check,
  onDone,
}: {
  exerciseId: string
  view: ViewCode
  check?: FormCheck
  onDone: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => (check ? draftOf(check) : emptyDraft(view)))
  const [showErrors, setShowErrors] = useState(false)
  const help = useHelp()
  const save = useSaveFormCheck(exerciseId, check?.id)
  const remove = useDeactivateFormCheck(exerciseId)
  const errors = validateDraft(draft)
  const range = rangeOf(draft)
  const measure = draft.measure ? MEASURES[draft.measure] : null
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const typed = Boolean(draft.from || draft.to)

  function submit() {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    save.mutate(toInput(draft), { onSuccess: onDone })
  }

  const row = (label: string, key: HelpKey, body: ReactNode) => (
    <>
      <div className="flex items-center text-[13px] text-[var(--color-text-muted)]">
        {label}
        <HelpButton open={help.isOpen(key)} onClick={() => help.toggle(key)} />
      </div>
      <div className="min-w-0">{body}</div>
      {help.isOpen(key) && <HelpText id={key} className="col-span-2" />}
    </>
  )

  return (
    <div className="mt-2.5 flex gap-4 rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
      <div className="grid min-w-0 flex-1 grid-cols-[104px_1fr] items-center gap-x-3 gap-y-3.5">
        {row(
          "Khớp",
          "measure",
          <>
            <div className="flex flex-wrap gap-1.5">
              {measuresFor(view).map((k) => (
                <Chip key={k} on={draft.measure === k} onClick={() => set({ measure: k })}>
                  {MEASURES[k].name}
                </Chip>
              ))}
            </div>
            {showErrors && errors.measure && <Err>{errors.measure}</Err>}
          </>,
        )}
        {row(
          "Lúc đo",
          "moment",
          <div className="flex flex-wrap gap-1.5">
            {MOMENTS.map((m) => (
              <Chip key={m} on={draft.moment === m} onClick={() => set({ moment: m })}>
                {MOMENT_NAME[m]}
              </Chip>
            ))}
          </div>,
        )}
        {row(
          "Đạt khi",
          "range",
          <div className="flex flex-wrap items-center gap-2 text-sm">
            từ <DegreeInput label="Từ" value={draft.from} onChange={(from) => set({ from })} />
            đến <DegreeInput label="Đến" value={draft.to} onChange={(to) => set({ to })} />
          </div>,
        )}
        {row(
          "Sát ngưỡng",
          "warn",
          <div className="flex items-center gap-2 text-sm">
            lệch thêm <DegreeInput label="Sát ngưỡng" value={draft.warn} onChange={(warn) => set({ warn })} />
          </div>,
        )}
        <div />
        <div>
          {range && measure ? (
            <RangeBar range={range} max={measure.max} />
          ) : (
            <p
              className={cn(
                "text-xs",
                errors.range && (showErrors || typed) ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]",
              )}
            >
              {errors.range && (showErrors || typed) ? errors.range : "Nhập số để xem thanh màu."}
            </p>
          )}
        </div>
        {row(
          "Tên mục",
          "label",
          <>
            <Input
              value={draft.nameVi}
              onChange={(e) => set({ nameVi: e.target.value })}
              placeholder="vd: Ngồi đủ sâu"
              aria-label="Tên mục"
            />
            {showErrors && errors.nameVi && <Err>{errors.nameVi}</Err>}
          </>,
        )}
        {row(
          "Khi sai, nhắc",
          "cue",
          <>
            <Textarea
              rows={2}
              value={draft.cueFailVi}
              onChange={(e) => set({ cueFailVi: e.target.value })}
              placeholder="vd: Hạ hông tới khi đùi song song sàn."
              aria-label="Câu nhắc khi sai"
            />
            {showErrors && errors.cueFailVi && <Err>{errors.cueFailVi}</Err>}
          </>,
        )}
        {save.isError && <p className="col-span-2 text-sm text-[var(--color-danger)]">{save.error.message}</p>}
        <div className="col-span-2 flex gap-2.5">
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : "Xong"}
          </Button>
          <Button size="sm" variant="secondary" onClick={onDone}>
            Huỷ
          </Button>
          {check && (
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto text-[var(--color-danger)]"
              disabled={remove.isPending}
              onClick={() => remove.mutate(check.id, { onSuccess: onDone })}
            >
              Xoá khớp này
            </Button>
          )}
        </div>
      </div>
      <div className="w-[170px] flex-none">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
          <MeasureFigure view={view} measure={draft.measure} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
          {measure ? (
            <>
              <b className="text-[var(--color-text)]">{measure.name}</b>
              <br />
              {measure.ref}
            </>
          ) : (
            "Chọn khớp để xem chỗ đo."
          )}
        </p>
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        on
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
          : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-text-muted)]",
      )}
    >
      {children}
    </button>
  )
}

function DegreeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex h-[38px] items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 focus-within:border-[var(--color-accent)]">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} (độ)`}
        className="num w-11 bg-transparent text-right text-base font-bold outline-none"
      />
      <span className="ml-0.5 text-[var(--color-text-muted)]">°</span>
    </label>
  )
}

function Err({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-[var(--color-danger)]">{children}</p>
}
