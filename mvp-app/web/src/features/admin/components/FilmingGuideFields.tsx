import type { UseFormRegister } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/cn"
import { VIEW_NAME, VIEW_ORDER, type ViewCode } from "@/lib/formMeasures"
import type { ExerciseFormValues } from "@/features/admin/utils/filmingGuideForm"

/** Câu người tập thấy khi ô bỏ trống — chép từ DEFAULT_TIPS của FilmingGuidePage, hiện làm chữ mờ trong ô. */
const PLACEHOLDER = {
  distance: "Cách 2–3 m, cả người trong khung suốt set.",
  lighting: "Ánh sáng từ phía trước, tránh ngược sáng.",
  duration: "Quay 3–5 rep là đủ, tối đa 30 giây.",
}

/**
 * Mục "Hướng dẫn quay" thay ô JSON cũ (doc/design-anh-bai-tap-v1.md §2, mockup doc/mockup-anh-bai-tap).
 * Lưu ý góc nào bài chưa có khớp cần kiểm thì vẫn cho gõ trước, nhưng ghi rõ người tập chưa thấy:
 * màn gửi clip chỉ hiện thẻ các góc có trong checkViews.
 */
export function FilmingGuideFields({
  register,
  checkViews,
}: {
  register: UseFormRegister<ExerciseFormValues>
  checkViews: ViewCode[]
}) {
  return (
    <section className="space-y-3 border-t border-[var(--color-border)] pt-4.5">
      <div>
        <h2 className="text-[15px] font-bold">Hướng dẫn quay</h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Hiện ở màn gửi clip. Ô bỏ trống thì người tập thấy câu dặn mặc định (chữ mờ trong ô).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="guide-distance">Khoảng cách, vị trí đặt máy</Label>
        <Input id="guide-distance" placeholder={PLACEHOLDER.distance} {...register("guide.distance")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="guide-lighting">Ánh sáng</Label>
          <Input id="guide-lighting" placeholder={PLACEHOLDER.lighting} {...register("guide.lighting")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guide-duration">Độ dài clip</Label>
          <Input id="guide-duration" placeholder={PLACEHOLDER.duration} {...register("guide.duration")} />
        </div>
      </div>
      <div className="pt-1 text-sm font-semibold">Lưu ý cho từng góc quay</div>
      <div className="space-y-2">
        {VIEW_ORDER.map((view) => {
          const used = checkViews.includes(view)
          return (
            <div
              key={view}
              className="grid grid-cols-[150px_1fr] items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3"
            >
              <label htmlFor={`guide-note-${view}`} className="pt-2 text-sm font-semibold">
                {VIEW_NAME[view]}
                <span
                  className={cn(
                    "mt-0.5 block text-[11px] font-normal",
                    used ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
                  )}
                >
                  {used ? "đang chấm ở góc này" : "chưa có khớp cần kiểm, người tập không thấy dòng này"}
                </span>
              </label>
              <Input
                id={`guide-note-${view}`}
                className={cn(!used && "opacity-70")}
                {...register(`guide.notes.${view}`)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
