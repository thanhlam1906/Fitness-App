import { Link } from "react-router"
import { IconText } from "@/components/StatusViews"
import { ListRowsSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { useTemplates } from "@/features/admin/api/useTemplates"

/** Cột trái trang template. Số người đang dùng hiện sẵn để admin biết sửa quy tắc là đụng tới ai. */
export function TemplateListPanel({ activeId }: { activeId?: string }) {
  const templates = useTemplates()

  return (
    <div className="flex w-[260px] flex-none flex-col border-r border-[var(--color-border)]">
      <Link
        to="/admin/templates/new"
        className="m-3 rounded-[var(--radius-md)] bg-[var(--color-accent)] py-2.5 text-center text-sm font-bold text-[var(--color-accent-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        + Thêm template
      </Link>
      <div className="min-h-0 flex-1 overflow-auto">
        {templates.isLoading && <ListRowsSkeleton />}
        {templates.isError && <IconText className="p-4">{templates.error.message}</IconText>}
        {templates.data?.map((t) => {
          const active = t.id === activeId
          const sessions = t.sessionsMin === t.sessionsMax ? `${t.sessionsMin}` : `${t.sessionsMin}–${t.sessionsMax}`
          return (
            <Link
              key={t.id}
              to={`/admin/templates/${t.id}`}
              className={cn(
                "block border-t border-[var(--color-surface-2)] px-4 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                active
                  ? "border-l-[3px] border-l-[var(--color-accent)] bg-[var(--color-surface-2)] pl-[13px]"
                  : "hover:bg-[var(--color-surface)]",
              )}
            >
              <div className={cn("truncate text-sm", active && "font-bold")}>{t.name}</div>
              <div
                className={cn(
                  "num mt-px truncate text-[11px]",
                  t.active ? "text-[var(--color-text-muted)]" : "text-[var(--color-warn)]",
                )}
              >
                {t.active ? `${sessions} buổi · ${t.activeUsers} người dùng` : "Đã tắt"}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
