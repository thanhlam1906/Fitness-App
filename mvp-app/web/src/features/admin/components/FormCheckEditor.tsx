import { useState } from "react"
import { cn } from "@/lib/cn"
import { MEASURES, MOMENT_NAME, VIEW_NAME, VIEW_ORDER, shortRule, type ViewCode } from "@/lib/formMeasures"
import type { FormCheck } from "@/features/exercise/types"
import { useFormChecks } from "@/features/exercise/api/useExercises"
import { FormCheckForm } from "@/features/admin/components/FormCheckForm"
import { HelpButton, HelpText, useHelp } from "@/features/admin/components/HelpButton"
import { RangeBar } from "@/features/admin/components/RangeBar"

/**
 * Tab "Cách chấm form" (doc/design-cham-form-nguong-v1.md §4, mockup doc/mockup-form-check-admin/demo.html):
 * chọn góc camera, xem các khớp cần kiểm của góc đó, thêm hoặc sửa từng khớp. Chỉ mở một trình
 * sửa mỗi lúc để admin không lẫn khớp đang sửa.
 */
export function FormCheckEditor({ exerciseId }: { exerciseId: string }) {
  const formChecks = useFormChecks(exerciseId)
  const [view, setView] = useState<ViewCode>("SAGITTAL")
  const [editing, setEditing] = useState<string | null>(null) // id khớp, "new", hoặc null
  const help = useHelp()

  const checks = formChecks.data ?? []
  const count = (v: ViewCode) => checks.filter((c) => c.view === v).length
  const order = VIEW_ORDER.filter((v) => count(v) > 0)
  const inView = checks.filter((c) => c.view === view)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center text-base font-extrabold">
        Cách chấm form
        <HelpButton open={help.isOpen("form")} onClick={() => help.toggle("form")} />
      </div>
      {help.isOpen("form") && <HelpText id="form" className="mt-2" />}
      {formChecks.isLoading && <p className="mt-1 text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
      {formChecks.isError && <p className="mt-1 text-sm text-[var(--color-danger)]">{formChecks.error.message}</p>}
      {formChecks.data &&
        (order.length > 0 ? (
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Người tập sẽ quay:{" "}
            <b className="text-[var(--color-text)]">{order.map((v) => VIEW_NAME[v]).join(" → ")}</b>
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-[var(--color-warn)]">
            Chưa chấm form được. Chọn góc quay rồi thêm khớp cần kiểm.
          </p>
        ))}

      <div className="mt-4 flex items-center text-[13px] text-[var(--color-text-muted)]">
        Góc camera
        <HelpButton open={help.isOpen("view")} onClick={() => help.toggle("view")} />
      </div>
      {help.isOpen("view") && <HelpText id="view" className="mt-2" />}
      <div className="mt-2 flex gap-2">
        {VIEW_ORDER.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => {
              setView(v)
              setEditing(null)
            }}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              view === v
                ? "border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
            )}
          >
            <ViewIcon view={v} />
            {VIEW_NAME[v]}
            <span
              className={cn(
                "num ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full text-xs",
                view === v
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
              )}
            >
              {count(v)}
            </span>
          </button>
        ))}
      </div>
      {view === "DIAGONAL" && (
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">Góc chéo đo kém chính xác hơn. Chỉ dùng khi thật cần.</p>
      )}

      {formChecks.data && inView.length === 0 && editing !== "new" && (
        <p className="mt-2.5 text-[13px] text-[var(--color-text-muted)]">
          Góc {VIEW_NAME[view].toLowerCase()} chưa có khớp nào.
        </p>
      )}
      {inView.map((c) =>
        editing === c.id ? (
          <FormCheckForm key={c.id} exerciseId={exerciseId} view={view} check={c} onDone={() => setEditing(null)} />
        ) : (
          <CheckRow key={c.id} check={c} onEdit={() => setEditing(c.id)} />
        ),
      )}
      {editing === "new" ? (
        <FormCheckForm exerciseId={exerciseId} view={view} onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mt-2.5 h-11 w-full rounded-xl border-[1.5px] border-dashed border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          + Thêm khớp cần kiểm
        </button>
      )}
    </div>
  )
}

function CheckRow({ check, onEdit }: { check: FormCheck; onEdit: () => void }) {
  const measure = MEASURES[check.measure]
  return (
    <div className="mt-2.5 flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{check.nameVi}</div>
        <div className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
          {measure.name} · {MOMENT_NAME[check.moment].toLowerCase()} · đạt {shortRule(check)}
        </div>
      </div>
      <div className="w-[110px] flex-none">
        <RangeBar range={check} max={measure.max} mini />
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-[var(--radius-sm)] p-1 text-[13px] font-semibold text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        Sửa
      </button>
    </div>
  )
}

/** Nhìn từ trên xuống: chấm tròn là người tập, hình chữ nhật là camera. */
const CAMERA: Record<ViewCode, [number, number]> = { SAGITTAL: [52, 26], FRONTAL: [30, 6], DIAGONAL: [48, 9] }

function ViewIcon({ view }: { view: ViewCode }) {
  const [x, y] = CAMERA[view]
  return (
    <svg viewBox="0 0 60 40" width={36} height={24} aria-hidden="true" className="flex-none">
      <line x1={x} y1={y} x2={30} y2={27} stroke="var(--color-text-muted)" strokeWidth={1.2} strokeDasharray="3 3" />
      <ellipse cx={30} cy={28} rx={13} ry={4.5} fill="var(--color-border)" />
      <circle cx={30} cy={28} r={5} fill="var(--color-border)" />
      <path d="M27,22 L30,18 L33,22 Z" fill="var(--color-border)" />
      <rect x={x - 6} y={y - 4} width={12} height={8} rx={2} fill="currentColor" />
    </svg>
  )
}
