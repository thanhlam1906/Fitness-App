import { Link } from "react-router"
import { AdminHeader } from "@/components/AdminShell"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTemplates } from "./useTemplates"

/** concept-frontend-v1.md màn 12 — CRUD 5–6 template. */
export function TemplateListPage() {
  const templates = useTemplates()

  return (
    <>
      <AdminHeader group="Cấu hình" title="Template chương trình">
        <Link to="/admin/templates/new">
          <Button size="sm">+ Thêm template</Button>
        </Link>
      </AdminHeader>

      <div className="overflow-auto px-7 py-5.5">
        {templates.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
        {templates.isError && (
          <p className="text-sm text-[var(--color-danger)]">{templates.error.message}</p>
        )}

        <div className="flex max-w-3xl flex-col gap-2">
          {templates.data?.map((t) => (
            <Link key={t.id} to={`/admin/templates/${t.id}`}>
              <Card className="flex items-center justify-between hover:border-[var(--color-accent)]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="num truncate text-xs text-[var(--color-text-muted)]">
                    {t.slug} · {t.sessionsMin}
                    {t.sessionsMin !== t.sessionsMax ? `–${t.sessionsMax}` : ""} buổi/tuần ·{" "}
                    {t.requiredEquipment.join(", ") || "không yêu cầu thiết bị"}
                  </p>
                </div>
                {!t.active && <span className="text-xs text-[var(--color-text-muted)]">đã tắt</span>}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
