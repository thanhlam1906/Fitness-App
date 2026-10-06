import { useSearchParams } from "react-router"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { InsightTable } from "@/features/admin/components/InsightTable"
import { useTemplates } from "@/features/admin/api/useTemplates"
import { useWorkoutInsights } from "@/features/admin/api/useWorkoutInsights"
import {
  INSIGHT_DAYS,
  bodyAreaLabel,
  percent,
  readInsightsFilter,
  ruleLabel,
  skipReasonLabel,
  writeInsightsFilter,
  type InsightsFilter,
} from "@/features/admin/utils/workoutInsights"
import { cn } from "@/lib/cn"

/**
 * Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md): người tập đang vấp ở đâu để HLV
 * sửa template. Chỉ đọc. Đang lọc một template thì tên bài là link sang form template đó;
 * "Tất cả" thì không, vì một bài có thể nằm ở nhiều template.
 */
export function WorkoutInsightsPage() {
  const [params, setParams] = useSearchParams()
  const filter = readInsightsFilter(params)
  const templates = useTemplates()
  const insights = useWorkoutInsights(filter.templateId, filter.days)
  const data = insights.data
  // Lấy theo dữ liệu đang hiện, không theo URL: lúc đổi bộ lọc keepPreviousData còn giữ số của bộ lọc cũ.
  const shownTemplateId = data?.templateId ?? null
  const link = shownTemplateId ? `/admin/templates/${shownTemplateId}` : undefined

  function update(next: Partial<InsightsFilter>) {
    setParams(writeInsightsFilter({ ...filter, ...next }), { replace: true })
  }

  return (
    <>
      <AdminHeader group="Theo dõi" title="Buổi tập">
        <select
          aria-label="Template"
          value={filter.templateId ?? ""}
          onChange={(e) => update({ templateId: e.target.value || null })}
          className="h-[38px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <option value="">Tất cả template</option>
          {templates.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div role="group" aria-label="Khoảng thời gian" className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          {INSIGHT_DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={filter.days === d}
              onClick={() => update({ days: d })}
              className={cn(
                "num px-4 py-2 text-[13px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                i > 0 && "border-l border-[var(--color-border)]",
                filter.days === d
                  ? "bg-[var(--color-accent)] font-bold text-[var(--color-accent-fg)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        {insights.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {insights.isError && <p className="text-sm text-[var(--color-danger)]">{insights.error.message}</p>}

        {data && (
          <div className="grid gap-4 xl:grid-cols-2">
            <InsightTable
              title="Bài bị bỏ nhiều"
              hint="Số set bị bỏ trên tổng set đã ghi. Ẩn bài có dưới 10 set."
              columns={["Bài", "Bỏ", "Set", "Người bỏ", "Lý do chính"]}
              rows={data.skipped.map((r) => ({
                key: r.exerciseId,
                to: link,
                cells: [r.exerciseName, percent(r.skippedSets, r.sets), r.sets, r.users, skipReasonLabel(r.topReason)],
              }))}
            />
            <InsightTable
              title="RPE vượt mức"
              hint="RPE set cuối cao hơn mục tiêu + mức vượt của template. Ẩn bài có dưới 10 lần ghi RPE."
              columns={["Bài", "Vượt", "Lần có RPE", "RPE TB"]}
              rows={data.rpeOver.map((r) => ({
                key: r.exerciseId,
                to: link,
                cells: [r.exerciseName, percent(r.overCount, r.rpeLogs), r.rpeLogs, r.avgRpe.toFixed(1)],
              }))}
            />
            <InsightTable
              title="Bài hay hụt rep"
              hint="Set có số rep dưới sàn của khoảng rep trong lịch. Ẩn bài có dưới 10 set."
              columns={["Bài", "Hụt", "Set", "Rep TB", "Sàn TB"]}
              rows={data.repShort.map((r) => ({
                key: r.exerciseId,
                to: link,
                cells: [
                  r.exerciseName,
                  percent(r.shortSets, r.sets),
                  r.sets,
                  r.avgReps.toFixed(1),
                  r.avgFloor.toFixed(1),
                ],
              }))}
            />
            <InsightTable
              title="Bài hay bị đổi"
              hint={'Số người đã bấm "Thay bài" lúc tập để đổi bài này, trên số người có bài này trong lịch.'}
              columns={["Bài gốc", "Người đổi", "Đổi sang nhiều nhất"]}
              rows={data.substituted.map((r) => ({
                key: r.exerciseId,
                to: link,
                cells: [r.exerciseName, `${r.usersSubstituted}/${r.usersScheduled} người`, r.topReplacementName ?? "—"],
              }))}
            />
            <InsightTable
              title="Báo đau theo vùng"
              hint="Báo đau cuối buổi. Bài hay có mặt: bài được ghi set trong nhiều buổi báo đau nhất."
              columns={["Vùng", "Lần", "Người", "Mức TB", "Bài hay có mặt"]}
              rows={data.pain.map((r) => ({
                key: r.bodyArea,
                cells: [bodyAreaLabel(r.bodyArea), r.reports, r.users, r.avgSeverity.toFixed(1), r.topExerciseName ?? "—"],
              }))}
            />
            <InsightTable
              title="Tăng / giảm tạ"
              hint={
                shownTemplateId
                  ? "Quyết định tải của template này, theo bài."
                  : "Quyết định tải theo template. Chọn một template để xem theo bài."
              }
              columns={[shownTemplateId ? "Bài" : "Template", "Tăng", "Giữ", "Giảm", "Lý do giảm chính"]}
              rows={data.loadDecisions.map((r) => ({
                key: r.key ?? "custom",
                to: shownTemplateId ? link : undefined,
                cells: [r.name, r.up, r.hold, r.down, ruleLabel(r.topDownRule)],
              }))}
            />
          </div>
        )}
      </div>
    </>
  )
}
