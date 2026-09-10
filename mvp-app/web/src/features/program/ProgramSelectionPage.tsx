import { useState } from "react"
import { Link } from "react-router"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowScreen } from "@/components/UserShell"
import { cn } from "@/lib/cn"
import { WEEKDAYS } from "./schema"
import { loadableExercises, useCandidates, type TemplateCandidate } from "./useCandidates"
import { useCreateProgram } from "./useCreateProgram"

const ORDINALS = ["Đề xuất chính", "Phương án hai", "Phương án ba", "Phương án bốn"]
const ALL_DAYS = WEEKDAYS.map((d) => d.value)

/**
 * Màn 3 concept-frontend-v1.md — đề xuất 1–2 template, XEM CẤU TRÚC TUẦN rồi
 * xác nhận, chọn ngày nghỉ.
 *
 * Design hỏi "ngày TẬP trong tuần" chứ không phải ngày nghỉ — người dùng nghĩ
 * theo ngày mình đi tập. API vẫn nhận restDays, đảo lại khi gửi.
 *
 * Bước 6 của onboarding ("mức tạ khởi điểm", A7) nằm ở đây: danh sách bài cần
 * nhập tạ chỉ biết được sau khi chọn template, nên hỏi ở đây thì người dùng
 * thấy đúng tên bài thay vì phải gõ slug.
 */
export function ProgramSelectionPage() {
  const candidates = useCandidates()
  const createProgram = useCreateProgram()

  const [templateId, setTemplateId] = useState("")
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [loads, setLoads] = useState<Record<string, string>>({})

  const selected = candidates.data?.find((c) => c.id === templateId) ?? null

  if (createProgram.isSuccess) {
    return (
      <FlowScreen>
        <div className="kicker">Xong</div>
        <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
          Đã tạo chương trình.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          Lịch 4 tuần đầu đã sinh từ template và mức tạ khởi điểm. Từ tuần sau, engine điều chỉnh
          theo kết quả tập thật và luôn nói rõ lý do.
        </p>
        <div className="flex-1" />
        <Link to="/schedule">
          <Button className="w-full">Xem lịch tuần</Button>
        </Link>
      </FlowScreen>
    )
  }

  if (candidates.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải đề xuất…</p>
  }

  if (candidates.isError) {
    const needsOnboarding = candidates.error instanceof ApiError && candidates.error.status === 404
    return (
      <EmptyState
        message={
          needsOnboarding
            ? "Cần hoàn tất hồ sơ trước khi đề xuất chương trình."
            : `Không tải được đề xuất: ${candidates.error.message}`
        }
        action={{ to: "/onboarding", label: needsOnboarding ? "Hoàn tất hồ sơ" : "Về onboarding" }}
      />
    )
  }

  if (candidates.data!.length === 0) {
    return (
      <EmptyState
        message="Không có chương trình nào khớp số buổi/tuần và thiết bị đã khai. Chỉnh lại ở màn Hồ sơ rồi quay lại."
        action={{ to: "/settings", label: "Mở hồ sơ" }}
      />
    )
  }

  const restDays = ALL_DAYS.filter((d) => !trainingDays.includes(d))

  return (
    <FlowScreen>
      <div className="kicker">Đề xuất cho hồ sơ của bạn</div>
      <h1 className="num mt-3 text-[28px] font-extrabold tracking-[-0.02em]">
        {candidates.data!.length} chương trình phù hợp
      </h1>

      <div className="mt-5 space-y-3">
        {candidates.data!.map((template, i) => (
          <TemplateCard
            key={template.id}
            template={template}
            rank={ORDINALS[i] ?? `Phương án ${i + 1}`}
            selected={template.id === templateId}
            onSelect={() => setTemplateId(template.id)}
          />
        ))}
      </div>

      {selected && (
        <>
          <div className="kicker mt-6">Ngày tập trong tuần</div>
          <div className="mt-2.5 flex gap-1.5">
            {WEEKDAYS.map((d) => {
              const on = trainingDays.includes(d.value)
              return (
                <label
                  key={d.value}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg py-3 text-center text-[13px]",
                    on
                      ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={(e) =>
                      setTrainingDays((prev) =>
                        e.target.checked
                          ? [...prev, d.value]
                          : prev.filter((v) => v !== d.value),
                      )
                    }
                  />
                  {d.label}
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
            Đổi được sau, không mất tiến độ.
          </p>
          {trainingDays.length === 0 && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">Chọn ít nhất một ngày tập.</p>
          )}

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="startDate">Ngày bắt đầu</Label>
            <Input
              id="startDate"
              type="date"
              className="num"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="kicker mt-6">Mức tạ khởi điểm</div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            Chọn mức bạn làm được 2 set đầu mà vẫn còn dư sức. Bỏ trống cũng được — lúc đó lịch
            không gợi ý tải và bạn tự nhập trong buổi đầu.
          </p>
          <div className="mt-3 space-y-3">
            {loadableExercises(selected).map((exercise) => (
              <div key={exercise.slug} className="flex items-center gap-3">
                <Label htmlFor={`load-${exercise.slug}`} className="flex-1 text-[15px]">
                  {exercise.name}
                </Label>
                <Input
                  id={`load-${exercise.slug}`}
                  type="number"
                  step="0.5"
                  min={0}
                  placeholder="kg"
                  className="num w-28"
                  value={loads[exercise.slug] ?? ""}
                  onChange={(e) =>
                    setLoads((prev) => ({ ...prev, [exercise.slug]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          {createProgram.isError && (
            <p className="mt-3 text-sm text-[var(--color-danger)]">
              Tạo chương trình thất bại: {createProgram.error.message}
            </p>
          )}

          <div className="flex-1" />
          <Button
            className="mt-6 w-full"
            disabled={createProgram.isPending || trainingDays.length === 0}
            onClick={() =>
              createProgram.mutate({
                templateId: selected.id,
                restDays,
                startDate,
                startingLoadsBySlug: Object.fromEntries(
                  Object.entries(loads)
                    .filter(([, value]) => value !== "")
                    .map(([slug, value]) => [slug, Number(value)]),
                ),
              })
            }
          >
            {createProgram.isPending ? "Đang tạo…" : "Bắt đầu chương trình"}
          </Button>
        </>
      )}
    </FlowScreen>
  )
}

/** §5.1 — "Người dùng xem cấu trúc rồi xác nhận hoặc đổi." Cấu trúc phải xem được TRƯỚC khi chọn. */
function TemplateCard({
  template,
  rank,
  selected,
  onSelect,
}: {
  template: TemplateCandidate
  rank: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <label
      className={cn(
        "block cursor-pointer rounded-xl p-4",
        selected
          ? "border border-[var(--color-accent)] bg-[var(--color-surface-2)]"
          : "border border-transparent bg-[var(--color-surface)]",
      )}
    >
      <input
        type="radio"
        name="template"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[11px] font-bold tracking-[0.1em] uppercase",
            selected ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
          )}
        >
          {rank}
        </span>
        {selected && (
          <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-accent-fg)]">
            Đang chọn
          </span>
        )}
      </div>
      <div className="mt-2 text-[19px] font-bold">{template.name}</div>
      {template.methodology && (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {template.methodology}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag selected={selected}>
          {template.sessionsMin}–{template.sessionsMax} buổi/tuần
        </Tag>
        <Tag selected={selected}>{template.days.length} buổi trong chu kỳ</Tag>
      </div>

      {selected && (
        <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
          {template.days.map((day) => (
            <div key={day.order}>
              <p className="text-[13px] font-semibold">Buổi {day.label}</p>
              <p className="num mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {day.exercises
                  .map(
                    (ex) =>
                      `${ex.name} ${ex.sets}×${ex.repsMin}${ex.repsMax > ex.repsMin ? `–${ex.repsMax}` : ""}`,
                  )
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </label>
  )
}

function Tag({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "num rounded-full px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]",
        selected ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-2)]",
      )}
    >
      {children}
    </span>
  )
}

function EmptyState({
  message,
  action,
}: {
  message: string
  action: { to: string; label: string }
}) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      <Link to={action.to}>
        <Button>{action.label}</Button>
      </Link>
    </Card>
  )
}
