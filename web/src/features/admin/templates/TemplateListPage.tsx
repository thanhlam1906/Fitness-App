import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTemplates } from "./useTemplates"

/** concept-frontend-v1.md màn 12 — CRUD 5–6 template. */
export function TemplateListPage() {
  const templates = useTemplates()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Template chương trình</h1>
        <Link to="/admin/templates/new">
          <Button>+ Thêm template</Button>
        </Link>
      </div>

      {templates.isLoading && <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>}
      {templates.isError && (
        <p className="text-sm text-[var(--color-danger)]">{templates.error.message}</p>
      )}

      <div className="space-y-2">
        {templates.data?.map((t) => (
          <Link key={t.id} to={`/admin/templates/${t.id}`}>
            <Card className="flex items-center justify-between hover:border-[var(--color-accent)]">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
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
  )
}
