import { CalendarCheck, Dumbbell, Flame, HeartPulse, Repeat, SkipForward, TrendingDown } from "lucide-react"
import { useSearchParams } from "react-router"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { DaysToggle } from "@/features/admin/components/DaysToggle"
import { DonutChart } from "@/features/admin/components/DonutChart"
import { InsightCard, StatTile } from "@/features/admin/components/InsightCard"
import { BarList, StackedList } from "@/features/admin/components/InsightRows"
import { useTemplates } from "@/features/admin/api/useTemplates"
import { useWorkoutInsights } from "@/features/admin/api/useWorkoutInsights"
import type { WorkoutInsights } from "@/features/admin/types"
import {
  painSlices,
  percent,
  readInsightsFilter,
  ruleLabel,
  skipReasonLabel,
  skipReasonSlices,
  topSkipReason,
  writeInsightsFilter,
  type InsightsFilter,
} from "@/features/admin/utils/workoutInsights"

/**
 * Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md): người tập đang vấp ở đâu để HLV
 * sửa template. Chỉ đọc. Đang lọc một template thì tên bài là link sang form template đó;
 * "Tất cả" thì không, vì một bài có thể nằm ở nhiều template. Bố cục biểu đồ theo spec §10,
 * mockup doc/mockup-trang-buoi-tap/demo.html.
 */
export function WorkoutInsightsPage() {
  const [params, setParams] = useSearchParams()
  const filter = readInsightsFilter(params)
  const templates = useTemplates()
  const insights = useWorkoutInsights(filter.templateId, filter.days)

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
        <DaysToggle value={filter.days} onChange={(days) => update({ days })} />
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        {insights.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {insights.isError && <p className="text-sm text-[var(--color-danger)]">{insights.error.message}</p>}
        {insights.data && <InsightsBody data={insights.data} />}
      </div>
    </>
  )
}

/**
 * Thân trang. Link và nhãn lấy theo `data.templateId` (dữ liệu đang hiện), không theo URL: lúc đổi bộ lọc
 * keepPreviousData còn giữ số của bộ lọc cũ.
 */
function InsightsBody({ data }: { data: WorkoutInsights }) {
  const s = data.summary
  const byExercise = data.templateId != null
  const link = byExercise ? `/admin/templates/${data.templateId}` : undefined
  const decisions = s.up + s.hold + s.down

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={SkipForward}
          tone="var(--color-accent)"
          label="Set bị bỏ"
          value={percent(s.skippedSets, s.sets)}
          unit={`${s.skippedSets} / ${s.sets} set`}
          detail={`Lý do chính: ${topSkipReason(s.skipReasons) ?? "—"}`}
        />
        <StatTile
          icon={Flame}
          tone="var(--color-warn)"
          label="RPE vượt mức"
          value={percent(s.overCount, s.rpeLogs)}
          unit={`${s.overCount} / ${s.rpeLogs} lần`}
          detail="Mục tiêu + mức vượt của template"
        />
        <StatTile
          icon={HeartPulse}
          tone="var(--color-danger)"
          label="Báo đau"
          value={String(s.painReports)}
          unit="lần"
          detail={`${s.painUsers} người · mức TB ${s.avgPainSeverity.toFixed(1)}`}
        />
        <StatTile
          icon={CalendarCheck}
          tone="var(--color-chart-1)"
          label="Buổi đã tập"
          value={String(s.sessions)}
          unit="buổi"
          detail={`${s.users} người · ${s.missedWorkouts} buổi lỡ`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          icon={SkipForward}
          tone="var(--color-accent)"
          title="Lý do bỏ set"
          hint="Tất cả set bị bỏ trong khoảng, theo lý do người tập chọn."
        >
          <DonutChart slices={skipReasonSlices(s.skipReasons)} center={String(s.skippedSets)} centerLabel="set bị bỏ" />
        </InsightCard>
        <InsightCard
          icon={HeartPulse}
          tone="var(--color-danger)"
          title="Báo đau theo vùng"
          hint="Báo đau cuối buổi. Rê chuột để xem bài hay có mặt."
        >
          <DonutChart slices={painSlices(data.pain, s.painReports)} center={String(s.painReports)} centerLabel="lần báo đau" />
        </InsightCard>
        <InsightCard
          icon={Dumbbell}
          tone="var(--color-success)"
          title="Tăng / giữ / giảm tạ"
          hint="Mọi quyết định tải hệ thống đưa ra trong khoảng."
        >
          <DonutChart
            slices={[
              { key: "UP", label: "Tăng", value: s.up, color: "var(--color-success)" },
              { key: "HOLD", label: "Giữ", value: s.hold, color: "var(--color-chart-neutral)" },
              { key: "DOWN", label: "Giảm", value: s.down, color: "var(--color-danger)" },
            ]}
            center={percent(s.down, decisions)}
            centerLabel="là giảm tạ"
          />
        </InsightCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightCard
          icon={SkipForward}
          tone="var(--color-accent)"
          title="Bài bị bỏ nhiều"
          hint="Phần trăm set bị bỏ trên tổng set đã ghi."
        >
          <BarList
            color="var(--color-accent)"
            rows={data.skipped.map((r) => ({
              key: r.exerciseId,
              name: r.exerciseName,
              sub: `${r.skippedSets}/${r.sets} set · chủ yếu ${skipReasonLabel(r.topReason)} · ${r.users} người`,
              value: r.skippedSets / r.sets,
              label: percent(r.skippedSets, r.sets),
              to: link,
            }))}
          />
        </InsightCard>
        <InsightCard
          icon={Flame}
          tone="var(--color-warn)"
          title="RPE vượt mức"
          hint="RPE set cuối cao hơn mục tiêu + mức vượt của template."
        >
          <BarList
            color="var(--color-warn)"
            rows={data.rpeOver.map((r) => ({
              key: r.exerciseId,
              name: r.exerciseName,
              sub: `${r.overCount}/${r.rpeLogs} lần · RPE TB ${r.avgRpe.toFixed(1)}`,
              value: r.overCount / r.rpeLogs,
              label: percent(r.overCount, r.rpeLogs),
              to: link,
            }))}
          />
        </InsightCard>
        <InsightCard
          icon={TrendingDown}
          tone="var(--color-accent)"
          title="Bài hay hụt rep"
          hint="Set có số rep dưới sàn của khoảng rep trong lịch."
        >
          <BarList
            color="var(--color-accent)"
            rows={data.repShort.map((r) => ({
              key: r.exerciseId,
              name: r.exerciseName,
              sub: `${r.shortSets}/${r.sets} set · TB ${r.avgReps.toFixed(1)} rep / sàn ${r.avgFloor.toFixed(1)}`,
              value: r.shortSets / r.sets,
              label: percent(r.shortSets, r.sets),
              to: link,
            }))}
          />
        </InsightCard>
        <InsightCard
          icon={Repeat}
          tone="var(--color-accent)"
          title="Bài hay bị đổi"
          hint='Số người đã bấm "Thay bài" lúc tập để đổi bài này, trên số người có bài này trong lịch.'
        >
          <BarList
            color="var(--color-accent)"
            rows={data.substituted.map((r) => ({
              key: r.exerciseId,
              name: r.exerciseName,
              sub: `${r.usersSubstituted}/${r.usersScheduled} người${r.topReplacementName ? ` → ${r.topReplacementName}` : ""}`,
              value: r.usersSubstituted / r.usersScheduled,
              label: percent(r.usersSubstituted, r.usersScheduled),
              to: link,
            }))}
          />
        </InsightCard>
        <InsightCard
          icon={Dumbbell}
          tone="var(--color-success)"
          title="Tăng / giảm tạ theo từng mục"
          hint={
            byExercise
              ? "Quyết định tải của template này, theo bài."
              : "Quyết định tải theo template. Chọn một template để xem theo bài."
          }
          className="xl:col-span-2"
        >
          <StackedList
            rows={data.loadDecisions.map((r) => ({
              key: r.key ?? "custom",
              name: r.name,
              sub: `Lý do giảm chính: ${ruleLabel(r.topDownRule)}`,
              up: r.up,
              hold: r.hold,
              down: r.down,
              to: byExercise ? link : undefined,
            }))}
          />
        </InsightCard>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Mỗi khối chỉ hiện 5 dòng cao nhất. Bài có dưới 10 set trong khoảng không vào các khối bỏ set, RPE, hụt rep.
      </p>
    </div>
  )
}
