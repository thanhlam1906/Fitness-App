import type { KeyboardEvent } from "react"
import { BODY_AREAS } from "@/features/workout/types"
import { BODY_VIEWS } from "@/features/workout/utils/bodyMap"
import { cn } from "@/lib/cn"

/**
 * Đường viền vô hình quanh mỗi vùng, tính bằng đơn vị viewBox (khung rộng 727): 60 đơn vị ≈ 8px
 * mỗi bên ở bề rộng hình ~170px. Gối hay hông chỉ to cỡ đầu ngón tay, vùng bắt chạm phải phình ra
 * khỏi hình chứ không bám theo hình, nếu không thì trượt tay suốt.
 */
const HIT_STROKE = 60

/**
 * Hình người mặt trước và mặt sau cho bộ chọn vùng đau (màn kết buổi). Mỗi vùng là một nhóm
 * path bấm được: role="button", được bàn phím, focus thấy được.
 *
 * Chỉ báo "vừa bấm vùng nào", việc bấm lại để bỏ chọn do trang gọi quyết định.
 */
export function BodyMap({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string) => void
}) {
  const selected = BODY_AREAS.find((area) => area.value === value)
  const onMap = new Set(BODY_VIEWS.flatMap((view) => view.areas.map((a) => a.area.value as string)))

  function onKey(event: KeyboardEvent, area: string) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onChange(area)
  }

  return (
    <div>
      <div className="mx-auto grid max-w-[360px] grid-cols-2 gap-4">
        {BODY_VIEWS.map((view) => (
          <figure key={view.key}>
            <svg viewBox={view.vb} className="block w-full">
              {/* Lớp dưới: vùng bắt chạm phình ra, cũng là nút cho bàn phím. Nằm dưới mọi hình thật
                  để bấm trúng hình vùng này không bao giờ bị viền phình của vùng bên cạnh cướp. */}
              {view.areas.map(({ area, paths, primary }) => (
                <g
                  key={area.value}
                  role={primary ? "button" : undefined}
                  tabIndex={primary ? 0 : -1}
                  aria-label={primary ? area.label : undefined}
                  aria-pressed={primary ? value === area.value : undefined}
                  aria-hidden={primary ? undefined : true}
                  onClick={() => onChange(area.value)}
                  onKeyDown={(event) => onKey(event, area.value)}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={HIT_STROKE}
                  strokeLinejoin="round"
                  className="cursor-pointer outline-none focus-visible:stroke-[var(--color-accent)] focus-visible:[stroke-width:24]"
                >
                  {paths.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
              ))}

              {/* Lớp trên: hình thật, currentColor pha mờ để tự hợp theme, không chốt màu riêng. */}
              <g aria-hidden="true" strokeWidth={5} className="cursor-pointer">
                {view.shapes.map(({ d, area }, i) => {
                  const on = value === area
                  return (
                    <path
                      key={i}
                      d={d}
                      onClick={() => onChange(area)}
                      fill={on ? "var(--color-danger)" : "currentColor"}
                      fillOpacity={on ? 0.55 : 0.34}
                      stroke={on ? "var(--color-danger)" : "none"}
                    />
                  )
                })}
              </g>
            </svg>
            <figcaption className="mt-1 text-center text-[11px] text-[var(--color-text-muted)]">{view.label}</figcaption>
          </figure>
        ))}
      </div>

      {/* Màu thôi thì phải đoán — nói thẳng tên vùng đang chọn bằng chữ. */}
      <p className="mt-2 text-center text-[13px] text-[var(--color-text-muted)]">
        {selected ? (
          <>
            Đang chọn{" "}
            <span className="font-semibold text-[var(--color-danger)]">{selected.label} ✓</span>
          </>
        ) : (
          "Chạm vào chỗ đau trên hình"
        )}
      </p>

      {/* Vùng không nằm trên cơ thể (Chỗ khác) thành nút riêng dưới sơ đồ. */}
      <div className="mt-3 flex justify-center">
        {BODY_AREAS.filter((area) => !onMap.has(area.value)).map((area) => {
          const on = value === area.value
          return (
            <button
              key={area.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(area.value)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                on
                  ? "border border-[var(--color-danger)] bg-[var(--color-danger-tint)] font-semibold text-[var(--color-danger)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
              )}
            >
              {area.label}
              {on && " ✓"}
            </button>
          )
        })}
      </div>
    </div>
  )
}
