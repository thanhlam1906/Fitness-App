import { useEffect, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { cn } from "@/lib/cn"
import { useProgressionPreview } from "@/features/admin/api/useTemplates"
import type { ProgramTemplateInput, ProgressionPreviewInput } from "@/features/admin/types"
import { progressionSchema } from "@/features/admin/types/templateSchema"
import { loadedSlugs, parseKg, ruleNumber } from "@/features/admin/utils/templateForm"

const KG = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 })
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
const BOX = cn(
  "num h-[34px] w-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-right font-bold outline-none focus:border-[var(--color-accent)]",
  FOCUS,
)
const CHECK = cn("size-4 accent-[var(--color-accent)]", FOCUS)

// Một feature dùng nên để tại chỗ. Debounce theo chuỗi JSON để object mới mỗi lần render không bắn lại.
function useDebounced(value: string | null, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/**
 * Buổi giả định → gọi engine thật ở backend với quy tắc ĐANG SỬA (chưa lưu). Không ghi gì.
 * Kết quả là con số máy tính cho admin xem, không phải góp ý cho người tập, nên không có nút "cái này sai".
 */
export function ProgressionPreview({
  onHit,
  nameOf,
  needsLoad,
}: {
  onHit: (n: 1 | 2 | 3 | 4 | null) => void
  nameOf: (slug: string) => string
  needsLoad: (slug: string) => boolean
}) {
  const { control } = useFormContext<ProgramTemplateInput>()
  const days = useWatch({ control, name: "days" }) ?? []
  const progression = useWatch({ control, name: "progression" })
  const candidates = loadedSlugs(days, needsLoad).filter((s) => typeof progression?.incrementKg?.[s] === "number")

  const [slug, setSlug] = useState("")
  const [loadKg, setLoadKg] = useState("60")
  const [reps, setReps] = useState<string[]>([])
  const [rpe, setRpe] = useState("8")
  const [pain, setPain] = useState(false)
  const [painBefore, setPainBefore] = useState(false)
  const [failBefore, setFailBefore] = useState("0")
  const [lowBefore, setLowBefore] = useState("0")

  const current = candidates.includes(slug) ? slug : (candidates[0] ?? "")
  const row = days.flatMap((d) => d.exercises).find((e) => e.slug === current)
  const sets = row && Number.isInteger(row.sets) && row.sets > 0 ? row.sets : 0
  const repValues = Array.from({ length: sets }, (_, i) => reps[i] ?? String(row?.repsMax ?? ""))

  // Ô kg đang gõ dở có thể là NaN: schema không qua thì không gọi API.
  const parsed = progressionSchema.safeParse(progression)
  const rpeValue = rpe.trim() === "" ? null : parseKg(rpe)
  const numbers = [loadKg, failBefore, lowBefore, ...repValues].map(parseKg)
  const input: ProgressionPreviewInput | null =
    row && sets > 0 && row.repsMin <= row.repsMax && parsed.success && numbers.every((x) => Number.isFinite(x) && x >= 0) &&
    (rpeValue === null || Number.isFinite(rpeValue))
      ? {
          progression: parsed.data,
          slug: current,
          sets,
          repsMin: row.repsMin,
          repsMax: row.repsMax,
          loadKg: parseKg(loadKg),
          reps: repValues.map(parseKg),
          rpe: rpeValue,
          pain,
          painBefore,
          failStreakBefore: parseKg(failBefore),
          rpeLowStreakBefore: parseKg(lowBefore),
        }
      : null

  const debounced = useDebounced(input ? JSON.stringify(input) : null, 300)
  const preview = useProgressionPreview(debounced ? (JSON.parse(debounced) as ProgressionPreviewInput) : null)
  const result = input ? preview.data : undefined
  const hit = result ? ruleNumber(result.ruleId) : null
  useEffect(() => {
    onHit(hit)
  }, [hit, onHit])

  if (candidates.length === 0) {
    return <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">Cần ít nhất một bài có “Tăng mỗi lần” để thử.</p>
  }

  const label = "text-[13px] text-[var(--color-text-muted)]"
  return (
    <div className="mt-3 flex gap-4.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="grid min-w-0 flex-1 grid-cols-[170px_1fr] items-center gap-x-3 gap-y-2.5">
        <span className={label}>Bài</span>
        <select
          value={current}
          onChange={(e) => {
            setSlug(e.target.value)
            setReps([])
          }}
          aria-label="Bài để thử"
          className={cn(
            "h-[34px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm outline-none focus:border-[var(--color-accent)]",
            FOCUS,
          )}
        >
          {candidates.map((s) => (
            <option key={s} value={s}>{nameOf(s)}</option>
          ))}
        </select>

        <span className={label}>Tạ đang tập</span>
        <span className="flex items-center gap-1.5 text-sm">
          <input value={loadKg} onChange={(e) => setLoadKg(e.target.value)} inputMode="decimal" aria-label="Tạ đang tập (kg)" className={BOX} /> kg
        </span>

        <span className={label}>Rep từng set</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {repValues.map((v, i) => (
            <input
              key={i}
              value={v}
              onChange={(e) => setReps(repValues.map((r, j) => (j === i ? e.target.value : r)))}
              inputMode="numeric"
              aria-label={`Rep set ${i + 1}`}
              className={BOX}
            />
          ))}
          {row && <span className="text-xs text-[var(--color-text-muted)]">mục tiêu {row.repsMin}–{row.repsMax}</span>}
        </span>

        <span className={label}>RPE set cuối</span>
        <span className="flex items-center gap-1.5">
          <input value={rpe} onChange={(e) => setRpe(e.target.value)} inputMode="decimal" aria-label="RPE set cuối" className={BOX} />
          <span className="text-xs text-[var(--color-text-muted)]">bỏ trống = không ghi</span>
        </span>

        <span className={label}>Báo đau</span>
        <span className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} className={CHECK} />Buổi này</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={painBefore} onChange={(e) => setPainBefore(e.target.checked)} className={CHECK} />Cả buổi trước</label>
        </span>

        <span className={label}>Trước buổi này</span>
        <span className="flex flex-wrap items-center gap-1.5 text-sm">
          hụt rep <input value={failBefore} onChange={(e) => setFailBefore(e.target.value)} inputMode="numeric" aria-label="Số buổi hụt rep liền trước đó" className={BOX} /> buổi liền ·
          RPE thấp <input value={lowBefore} onChange={(e) => setLowBefore(e.target.value)} inputMode="numeric" aria-label="Số buổi RPE thấp liền trước đó" className={BOX} /> buổi liền
        </span>
      </div>

      <div className="w-[300px] flex-none" aria-live="polite">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
          {!input ? (
            <p className="text-xs text-[var(--color-text-muted)]">Sửa các ô đang lỗi để thử.</p>
          ) : preview.isError ? (
            <p className="text-xs text-[var(--color-danger)]">{preview.error.message}</p>
          ) : !result ? (
            <p className="text-xs text-[var(--color-text-muted)]">Đang tính…</p>
          ) : (
            <>
              <div className="text-xs text-[var(--color-text-muted)]">Buổi tới</div>
              <div
                className={cn(
                  "num text-[22px] font-extrabold",
                  result.direction === "UP" && "text-[var(--color-success)]",
                  result.direction === "DOWN" && "text-[var(--color-danger)]",
                  result.direction === "SUBSTITUTE" && "text-[var(--color-warn)]",
                )}
              >
                {result.direction === "SUBSTITUTE"
                  ? "Đổi bài"
                  : result.direction === "HOLD"
                    ? `Giữ ${KG.format(result.newLoadKg)} kg`
                    : `${KG.format(result.newLoadKg)} kg (${(result.deltaKg ?? 0) > 0 ? "+" : "−"}${KG.format(Math.abs(result.deltaKg ?? 0))})`}
              </div>
              <p className="mt-1.5 text-[13px] leading-normal">
                <b className="text-[var(--color-accent)]">Quy tắc {hit}</b> · {result.messageVi}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
