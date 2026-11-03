import { CircleAlert, Dumbbell } from "lucide-react"
import { ExerciseImage } from "@/components/ExerciseImage"
import { cn } from "@/lib/cn"
import { EQUIPMENT_VI } from "@/lib/equipment"
import { MUSCLE_VI } from "@/lib/muscles"

/**
 * Phần thân thông tin một bài: ảnh động, mô tả, cơ chính, dụng cụ, cách tập, lỗi hay gặp. Dùng ở
 * khung chi tiết bài của màn Chương trình (features/schedule) và thẻ bài trong trợ lý
 * (features/assistant), nên nằm ở components/ (doc/design-thu-vien-bai-v1.md §7.3).
 *
 * `title` chỉ truyền khi khung ngoài chưa hiện tên bài (thẻ trợ lý); khung chi tiết đã có tên ở
 * tiêu đề nên bỏ qua. `equipment` không truyền thì không có dòng dụng cụ; mảng rỗng là tập tay không.
 *
 * `inCard`: khung ngoài không có lề (thẻ trợ lý, khung đã bo góc và cắt tràn) nên ảnh chạy sát mép khung,
 * chữ bên dưới tự có lề ngang và lề dưới như `.inner` của mockup. Khung chi tiết bài không truyền.
 */
export function ExerciseGuideBody({
  slug,
  title,
  description,
  muscleGroups,
  equipment,
  stepsVi,
  mistakesVi,
  inCard,
}: {
  slug: string
  title?: string
  description?: string | null
  muscleGroups: string[]
  equipment?: string[]
  stepsVi: string[]
  mistakesVi: string[]
  inCard?: boolean
}) {
  return (
    // px-3.5 của khung ngoài và -mx-3.5 của khối ảnh triệt nhau: chỉ ảnh sát mép, chữ vẫn có lề.
    <div className={inCard ? "px-3.5 pb-3.5" : undefined}>
      {/* alt rỗng: tên bài luôn hiện thành chữ ngay cạnh (tiêu đề khung chi tiết hoặc `title` của thẻ), alt có chữ thì trình đọc màn hình đọc tên hai lần. */}
      <div className={inCard ? "-mx-3.5" : undefined}>
        <ExerciseImage slug={slug} alt="" variant="large" inCard={inCard} />
      </div>
      {title && <div className="mt-3 text-base font-extrabold tracking-[-0.01em]">{title}</div>}
      {description && <p className="mt-3.5 text-sm leading-relaxed">{description}</p>}

      {muscleGroups.length > 0 && (
        <>
          <div className="section-title mt-5">Cơ chính</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {muscleGroups.map((code, i) => (
              <span
                key={code}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  i === 0
                    ? "bg-[var(--color-accent-tint)] text-[var(--color-accent)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
                )}
              >
                {MUSCLE_VI[code] ?? code}
              </span>
            ))}
          </div>
        </>
      )}

      {equipment && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
          <Dumbbell aria-hidden className="size-4 flex-none" />
          <span>
            Dụng cụ:{" "}
            <b className="font-semibold text-[var(--color-text)]">
              {equipment.length > 0 ? equipment.map((code) => EQUIPMENT_VI[code] ?? code).join(", ") : "Không cần"}
            </b>
          </span>
        </div>
      )}

      {stepsVi.length > 0 && (
        <>
          <div className="section-title mt-5">Cách tập</div>
          <ol className="mt-1.5">
            {/* key theo chỉ số: danh sách tĩnh, mà dữ liệu nhập vào có thể lặp nguyên một dòng. */}
            {stepsVi.map((step, i) => (
              <li key={i} className="flex gap-2.5 py-1.5 text-sm leading-relaxed">
                <span className="num mt-0.5 grid size-5.5 flex-none place-items-center rounded-full bg-[var(--color-surface-2)] text-xs font-extrabold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </>
      )}

      {mistakesVi.length > 0 && (
        <>
          <div className="section-title mt-5">Lỗi hay gặp</div>
          <ul className="mt-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[var(--color-warn-tint)] px-3 py-1">
            {mistakesVi.map((m, i) => (
              <li key={i} className="flex gap-2 py-1.5 text-[13px] leading-relaxed">
                <CircleAlert aria-hidden className="mt-[0.2em] size-4 flex-none text-[var(--color-warn)]" />
                {m}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
