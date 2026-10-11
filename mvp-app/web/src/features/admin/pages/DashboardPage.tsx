import {
  CalendarCheck,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Dumbbell,
  MessageCircle,
  ScanLine,
  Target,
  ThumbsDown,
  TriangleAlert,
  Users,
} from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import { IconText } from "@/components/StatusViews"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminDashboard } from "@/features/admin/api/useAdminDashboard"
import { useAdminOverview } from "@/features/admin/api/useAdminUsers"
import { useTemplates } from "@/features/admin/api/useTemplates"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { DaysToggle } from "@/features/admin/components/DaysToggle"
import { DonutChart } from "@/features/admin/components/DonutChart"
import { IconChip, InsightCard, StatTile } from "@/features/admin/components/InsightCard"
import { BarList } from "@/features/admin/components/InsightRows"
import { LineChart } from "@/features/admin/components/LineChart"
import type { AdminDashboard } from "@/features/admin/types"
import {
  completionRows,
  formCheckRows,
  goalSlices,
  COMPLETION_TOP,
  overallCompletion,
  pointLabel,
  programsWithSessions,
  wrongTotal,
} from "@/features/admin/utils/dashboard"
import { readInsightsFilter, writeInsightsFilter, type InsightDays } from "@/features/admin/utils/workoutInsights"
import { useExercises } from "@/features/exercise/api/useExercises"
import { cn } from "@/lib/cn"

/** Trang Tổng quan của admin, mockup doc/mockup-tong-quan-v2/demo.html, spec doc/design-tong-quan-v2-v1.md. Chỉ đọc. */
export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const { days } = readInsightsFilter(params)
  const dashboard = useAdminDashboard(days)
  const overview = useAdminOverview()
  const templates = useTemplates()
  const exercises = useExercises()
  const data = dashboard.data
  // keepPreviousData giữ số của khoảng cũ trong lúc tải khoảng mới: chữ đi kèm số phải theo khoảng của số.
  const shownDays = (data?.days ?? days) as InsightDays

  return (
    <>
      <AdminHeader group="Theo dõi" title="Tổng quan">
        <DaysToggle
          value={days}
          onChange={(d) => setParams(writeInsightsFilter({ templateId: null, days: d }), { replace: true })}
        />
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile
              icon={Users}
              tone="var(--color-accent)"
              label="Người dùng"
              value={String(overview.data?.statusCounts.ALL ?? "—")}
              unit=""
              detail={`+${overview.data?.newTraineesLast7Days ?? 0} mới tuần này · ${overview.data?.statusCounts.LOCKED ?? 0} đang khoá`}
            />
            <StatTile
              icon={ClipboardList}
              tone="var(--color-chart-1)"
              label="Template"
              value={String(templates.data?.length ?? "—")}
              unit=""
              detail={`${templates.data?.filter((t) => t.active).length ?? 0} đang bật`}
            />
            <StatTile
              icon={Dumbbell}
              tone="var(--color-warn)"
              label="Bài tập"
              value={String(exercises.data?.filter((e) => e.active).length ?? "—")}
              unit=""
              detail={`${exercises.data?.filter((e) => e.active && e.analyzable).length ?? 0} chấm form`}
            />
            <StatTile
              icon={CalendarCheck}
              tone="var(--color-success)"
              label="Buổi đã tập"
              value={String(data?.sessions ?? "—")}
              unit=""
              detail={`${shownDays} ngày qua`}
            />
          </div>

          <section className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2.5">
              <IconChip icon={TriangleAlert} tone="var(--color-warn)" />
              <h2 className="text-[15px] font-bold">Cần để ý</h2>
            </div>
            <div className="mt-3 grid gap-2.5 md:grid-cols-3">
              <AttentionTile
                count={overview.data?.notStartedTrainees}
                loading={overview.isLoading}
                text="Người đăng ký chưa tập buổi nào"
                sub="Mở danh sách lọc “Chưa bắt đầu”"
                to="/admin/users?status=NOT_STARTED&role=USER"
              />
              <AttentionTile
                count={data?.missedWorkouts}
                loading={dashboard.isLoading}
                text={`Buổi bị lỡ trong ${shownDays} ngày qua`}
                sub="Mở trang Buổi tập"
                to={`/admin/sessions?${writeInsightsFilter({ templateId: null, days: shownDays })}`}
              />
              {/* Chưa có trang xử lý góp ý (xem AdminShell) nên ô này chỉ báo số, không bấm được. */}
              <AttentionTile
                count={overview.data?.wrongFeedbackCount}
                loading={overview.isLoading}
                text="Góp ý bị báo sai, từ trước tới nay"
                sub="Chưa có trang xử lý riêng"
              />
            </div>
          </section>

          {dashboard.isLoading && (
            // Khung của năm khối bên dưới: hai hàng hai thẻ, rồi thẻ trợ lý rộng cả hàng.
            <div role="status" aria-label="Đang tải" className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-[280px]" />
              <Skeleton className="h-[280px]" />
              <Skeleton className="h-[280px]" />
              <Skeleton className="h-[280px]" />
              <Skeleton className="h-[240px] xl:col-span-2" />
            </div>
          )}
          {dashboard.isError && <IconText>{dashboard.error.message}</IconText>}
          {data && <Charts data={data} days={shownDays} />}
        </div>
      </div>
    </>
  )
}

/**
 * Một ô của "Cần để ý": số lớn tô cảnh báo khi khác 0. Có `to` thì cả ô là link sang trang xử lý.
 * Lỗi tải thì hiện "—" như các ô số, không để khung chờ mãi.
 */
function AttentionTile({
  count,
  loading,
  text,
  sub,
  to,
}: {
  count: number | undefined
  loading: boolean
  text: string
  sub: string
  to?: string
}) {
  const body = (
    <>
      {loading ? (
        <Skeleton className="h-7 w-9" />
      ) : (
        <span
          className={cn(
            "num min-w-9 text-2xl font-bold",
            (count ?? 0) > 0 ? "text-[var(--color-warn)]" : "text-[var(--color-text-muted)]",
          )}
        >
          {count ?? "—"}
        </span>
      )}
      <span className="min-w-0 flex-1 text-[13px] leading-snug">
        {text}
        <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">{sub}</span>
      </span>
      {to && <ChevronRight aria-hidden className="size-4 text-[var(--color-text-muted)]" />}
    </>
  )
  const cls =
    "flex items-center gap-3 rounded-[var(--radius-md)] border border-transparent bg-[var(--color-surface-2)] px-3.5 py-3"
  return to ? (
    <Link
      to={to}
      className={cn(
        cls,
        "hover:border-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const SOURCES = [
  ["wrongForm", "Chấm form"],
  ["wrongLoad", "Tăng giảm tạ"],
  ["wrongAssistant", "Trợ lý"],
] as const

function Charts({ data, days }: { data: AdminDashboard; days: InsightDays }) {
  const labels = data.timeline.map((p) => pointLabel(p.start, data.timelineUnit))
  const unit = data.timelineUnit === "WEEK" ? "tuần" : "ngày"
  const wrong = data.timeline.map(wrongTotal)
  const wrongSum = wrong.reduce((a, v) => a + v, 0)
  const questions = data.timeline.map((p) => p.questions)
  const questionSum = questions.reduce((a, v) => a + v, 0)
  const [allPrograms, setAllPrograms] = useState(false)
  const moreCount = programsWithSessions(data.programs).length - COMPLETION_TOP

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <InsightCard
        icon={Target}
        tone="var(--color-chart-1)"
        title="Mục tiêu người đang tập"
        hint="Người đang theo một chương trình, theo mục tiêu khai lúc đăng ký."
      >
        <DonutChart
          slices={goalSlices(data.goals)}
          center={String(data.goals.reduce((a, g) => a + g.users, 0))}
          centerLabel="người đang tập"
          emptyText="Chưa ai đang theo chương trình."
        />
      </InsightCard>

      <InsightCard
        icon={CircleCheckBig}
        tone="var(--color-success)"
        title="Hoàn thành buổi tập"
        hint={`Buổi đã tập chia cho buổi đã tập cộng buổi lỡ. Hiện ${COMPLETION_TOP} chương trình nhiều buổi nhất, số góc phải tính mọi chương trình.`}
        aside={overallCompletion(data.programs)}
      >
        <BarList
          below
          color="var(--color-accent)"
          rows={completionRows(data.programs, allPrograms ? Infinity : COMPLETION_TOP)}
        />
        {moreCount > 0 && (
          <button
            type="button"
            onClick={() => setAllPrograms((v) => !v)}
            aria-expanded={allPrograms}
            className="mt-3 rounded text-xs text-[var(--color-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {allPrograms ? "Thu gọn" : `Xem thêm ${moreCount} chương trình`}
          </button>
        )}
      </InsightCard>

      <InsightCard
        icon={ScanLine}
        tone="var(--color-chart-1)"
        title="Bài được chấm form nhiều nhất"
        hint="Top 5 bài theo số lượt chấm xong. Số góc phải là mọi lượt chấm xong."
        aside={data.formCheckTotal || undefined}
      >
        {data.topFormChecks.length === 0 ? (
          <IconText icon={ScanLine} tone="muted" className="justify-center py-6 text-xs">
            Chưa ai chấm form trong {days} ngày qua.
          </IconText>
        ) : (
          <BarList
            below
            color="var(--color-chart-1)"
            max={data.topFormChecks[0].checks}
            rows={formCheckRows(data.topFormChecks)}
          />
        )}
      </InsightCard>

      <InsightCard
        icon={ThumbsDown}
        tone="var(--color-danger)"
        title="Góp ý bị báo sai"
        hint="Số lần người tập bấm “cái này sai”, theo nơi sinh ra góp ý."
        aside={wrongSum || undefined}
      >
        {/* Một đường tổng: mỗi ngày chỉ vài góp ý, ba đường riêng chồng nhau khó đọc (người dùng duyệt 10-09). */}
        <LineChart
          values={wrong}
          labels={labels}
          color="var(--color-danger)"
          ariaLabel={`Góp ý bị báo sai theo ${unit}, tổng ${wrongSum}`}
          emptyText={`Không ai báo sai trong ${days} ngày qua.`}
          tip={(i) => (
            <>
              {SOURCES.map(([k, name]) => (
                <div key={k}>
                  {name}: {data.timeline[i][k]}
                </div>
              ))}
              <div className="font-bold">Tổng: {wrong[i]}</div>
            </>
          )}
        />
        {wrongSum > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-3.5 text-xs text-[var(--color-text-muted)]">
            {SOURCES.map(([k, name]) => (
              <span key={k}>
                {name}{" "}
                <b className="num text-[var(--color-text)]">{data.timeline.reduce((a, p) => a + p[k], 0)}</b>
              </span>
            ))}
          </div>
        )}
      </InsightCard>

      <InsightCard
        icon={MessageCircle}
        tone="var(--color-accent)"
        title="Trợ lý được hỏi"
        hint={`Số câu người tập gửi cho trợ lý, mỗi điểm một ${unit}.${questionSum > 0 ? ` ${data.assistantAskers} người đã hỏi ít nhất một câu.` : ""}`}
        aside={questionSum || undefined}
        className="xl:col-span-2"
      >
        <LineChart
          values={questions}
          labels={labels}
          color="var(--color-accent)"
          ariaLabel={`Câu hỏi gửi trợ lý theo ${unit}, tổng ${questionSum}`}
          emptyText={`Chưa ai hỏi trợ lý trong ${days} ngày qua.`}
          tip={(i) => (
            <>
              <div>{questions[i]} câu hỏi</div>
              <div>{data.timeline[i].askers} người hỏi</div>
            </>
          )}
        />
      </InsightCard>
    </div>
  )
}
