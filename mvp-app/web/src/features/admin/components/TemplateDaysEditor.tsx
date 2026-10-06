import { useFieldArray, useFormContext } from "react-hook-form"
import { cn } from "@/lib/cn"
import type { ProgramTemplateInput } from "@/features/admin/types"
import type { Exercise } from "@/features/exercise/types"
import { newExercise } from "@/features/admin/utils/templateForm"

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const FIELD =
  "h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm outline-none focus:border-[var(--color-accent)]"
const NUM = cn(FIELD, "num w-full text-right font-bold")

/** Buổi luân phiên theo thứ tự; mỗi buổi là danh sách bài. Lỗi hiện ngay dưới dòng (mode onChange). */
export function TemplateDaysEditor({ catalog }: { catalog: Exercise[] }) {
  const { control, getValues } = useFormContext<ProgramTemplateInput>()
  const days = useFieldArray({ control, name: "days" })

  return (
    <div className="space-y-3">
      {days.fields.map((field, d) => (
        <DayCard
          key={field.id}
          index={d}
          catalog={catalog}
          canDelete={days.fields.length > 1}
          onDuplicate={() => {
            const copy = structuredClone(getValues(`days.${d}`))
            days.insert(d + 1, { ...copy, label: `${copy.label} (2)` })
          }}
          onDelete={() => days.remove(d)}
        />
      ))}
      <button
        type="button"
        onClick={() => days.append({ label: String.fromCharCode(65 + days.fields.length), exercises: [newExercise()] })}
        className={cn(
          "h-11 w-full rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]",
          FOCUS,
        )}
      >
        + Thêm buổi
      </button>
    </div>
  )
}

function DayCard({
  index,
  catalog,
  canDelete,
  onDuplicate,
  onDelete,
}: {
  index: number
  catalog: Exercise[]
  canDelete: boolean
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { control, register, formState } = useFormContext<ProgramTemplateInput>()
  const rows = useFieldArray({ control, name: `days.${index}.exercises` })
  const dayErrors = formState.errors.days?.[index]
  const withGear = catalog.filter((e) => e.equipment.length > 0)
  const noGear = catalog.filter((e) => e.equipment.length === 0)
  const name = (e: Exercise) => e.nameVi ?? e.nameEn

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="w-[52px] text-xs text-[var(--color-text-muted)]">Buổi {index + 1}</span>
        <input
          {...register(`days.${index}.label`)}
          aria-label={`Tên buổi ${index + 1}`}
          placeholder="vd: A, Trên A"
          className={cn(FIELD, "w-40 font-bold")}
        />
        <span className="flex-1" />
        <button type="button" onClick={onDuplicate} className={cn("text-[13px] font-semibold text-[var(--color-accent)]", FOCUS)}>
          Nhân đôi buổi
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={cn("text-[13px] font-semibold text-[var(--color-danger)] disabled:opacity-30", FOCUS)}
        >
          Xoá buổi
        </button>
      </div>
      {dayErrors?.label && <p className="mt-1 text-xs text-[var(--color-danger)]">{dayErrors.label.message}</p>}

      {rows.fields.length > 0 && (
        <div className="mt-2.5 grid grid-cols-[22px_minmax(170px,1fr)_70px_140px_100px_92px] gap-2 px-0.5 text-[11.5px] text-[var(--color-text-muted)]">
          <span />
          <span>Bài</span>
          <span>Set</span>
          <span>Rep từ – đến</span>
          <span>Nghỉ (giây)</span>
          <span />
        </div>
      )}
      {rows.fields.map((row, i) => {
        const err = dayErrors?.exercises?.[i]
        const message = err?.slug?.message ?? err?.sets?.message ?? err?.repsMin?.message ?? err?.repsMax?.message ?? err?.restSec?.message
        const p = `days.${index}.exercises.${i}` as const
        return (
          <div key={row.id} className="mt-1.5 grid grid-cols-[22px_minmax(170px,1fr)_70px_140px_100px_92px] items-center gap-2">
            <span className="text-right text-xs text-[var(--color-text-muted)]">{i + 1}</span>
            <select {...register(`${p}.slug`)} aria-label={`Bài thứ ${i + 1}`} className={cn(FIELD, "w-full", err?.slug && "border-[var(--color-danger)]")}>
              <option value="">— Chọn bài —</option>
              <optgroup label="Có dụng cụ">
                {withGear.map((e) => (
                  <option key={e.slug} value={e.slug}>{name(e)}</option>
                ))}
              </optgroup>
              <optgroup label="Không dụng cụ">
                {noGear.map((e) => (
                  <option key={e.slug} value={e.slug}>{name(e)}</option>
                ))}
              </optgroup>
            </select>
            <input {...register(`${p}.sets`, { valueAsNumber: true })} inputMode="numeric" aria-label="Số set" className={NUM} />
            <span className="flex items-center gap-1">
              <input {...register(`${p}.repsMin`, { valueAsNumber: true })} inputMode="numeric" aria-label="Rep từ" className={NUM} />
              –
              <input {...register(`${p}.repsMax`, { valueAsNumber: true })} inputMode="numeric" aria-label="Rep đến" className={cn(NUM, err?.repsMax && "border-[var(--color-danger)]")} />
            </span>
            <input {...register(`${p}.restSec`, { valueAsNumber: true })} inputMode="numeric" aria-label="Nghỉ (giây)" className={NUM} />
            <span className="flex gap-0.5">
              <IconButton label="Lên" disabled={i === 0} onClick={() => rows.move(i, i - 1)}>↑</IconButton>
              <IconButton label="Xuống" disabled={i === rows.fields.length - 1} onClick={() => rows.move(i, i + 1)}>↓</IconButton>
              <IconButton label="Xoá bài" onClick={() => rows.remove(i)}>✕</IconButton>
            </span>
            {message && <p className="col-start-2 col-end-7 -mt-0.5 text-xs text-[var(--color-danger)]">{message}</p>}
          </div>
        )
      })}
      {rows.fields.length === 0 && (
        <p className="mt-2 text-[13px] text-[var(--color-warn)]">Buổi chưa có bài nào. Không lưu được.</p>
      )}
      <button
        type="button"
        onClick={() => rows.append(newExercise())}
        className={cn("mt-2 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]", FOCUS)}
      >
        + Thêm bài
      </button>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-7 rounded-[7px] border border-transparent text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-25",
        FOCUS,
      )}
    >
      {children}
    </button>
  )
}
