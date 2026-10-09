import { CalendarCheck, ClipboardList, Dumbbell, Users } from "lucide-react"
import { useSearchParams } from "react-router"
import { IconText } from "@/components/StatusViews"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminDashboard } from "@/features/admin/api/useAdminDashboard"
import { useAdminOverview } from "@/features/admin/api/useAdminUsers"
import { useTemplates } from "@/features/admin/api/useTemplates"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { DaysToggle } from "@/features/admin/components/DaysToggle"
import { DonutChart } from "@/features/admin/components/DonutChart"
import { StatTile } from "@/features/admin/components/InsightCard"
import { BarList } from "@/features/admin/components/InsightRows"
import { completionRows, goalSlices, overallCompletion } from "@/features/admin/utils/dashboard"
import { readInsightsFilter, writeInsightsFilter } from "@/features/admin/utils/workoutInsights"
import { useExercises } from "@/features/exercise/api/useExercises"

/** Trang Tổng quan của admin, mockup doc/mockup-tong-quan/demo.html. Chỉ đọc. */
export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const { days } = readInsightsFilter(params)
  const dashboard = useAdminDashboard(days)
  const overview = useAdminOverview()
  const templates = useTemplates()
  const exercises = useExercises()
  const data = dashboard.data

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
              detail={`${overview.data?.statusCounts.LOCKED ?? 0} đang khoá`}
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
              detail={`${days} ngày qua`}
            />
          </div>

          {dashboard.isLoading && (
            // Khung của hai khối: biểu đồ tròn mục tiêu, thanh hoàn thành theo chương trình.
            <div role="status" aria-label="Đang tải" className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-[280px]" />
              <Skeleton className="h-[280px]" />
            </div>
          )}
          {dashboard.isError && <IconText>{dashboard.error.message}</IconText>}
          {data && (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4">
                <h2 className="mb-4 text-[15px] font-bold">Mục tiêu người đang tập</h2>
                <DonutChart
                  slices={goalSlices(data.goals)}
                  center={String(data.goals.reduce((a, g) => a + g.users, 0))}
                  centerLabel="người đang tập"
                  emptyText="Chưa ai đang theo chương trình."
                />
              </section>
              <section className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-[15px] font-bold">Hoàn thành buổi tập</h2>
                  <span className="num text-[22px] font-bold">{overallCompletion(data.programs)}</span>
                </div>
                <BarList below color="var(--color-accent)" rows={completionRows(data.programs)} />
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
