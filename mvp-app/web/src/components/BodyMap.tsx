import { BODY_AREAS } from "@/features/workout/types"
import { cn } from "@/lib/cn"

const VIEW_W = 200
const VIEW_H = 330

/**
 * Vùng bắt chạm nhỏ nhất, tính bằng đơn vị viewBox: 38 đơn vị ≈ 46px ở bề rộng
 * render 240px. Hình vẽ cổ tay hay khuỷu tay nhỏ hơn thế nhiều — vùng bắt chạm
 * phải phình ra khỏi hình chứ không bám theo hình, nếu không thì trượt tay
 * suốt.
 */
const MIN_HIT = 38

type Spot = {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Ghi nhãn chữ ngay trên hình — chỉ cần cho mấy vùng nhìn từ trước không thấy. */
  labelled?: boolean
}

/**
 * Toạ độ trong khung 200×330, trục giữa thân x = 100: đầu y 12–50, vai y 75,
 * khuỷu y 140, cổ tay y 196, hông y 191, gối y 252, bàn chân y 312.
 *
 * TRÁI/PHẢI TÍNH THEO NGƯỜI TRONG HÌNH (quy ước y tế), nên "Vai trái" nằm ở
 * nửa BÊN PHẢI màn hình. Làm ngược là báo đau sai bên, mà báo đau là tín hiệu
 * ưu tiên cao nhất của engine điều chỉnh tải.
 *
 * Vùng nào không có ở đây thì không nằm trên cơ thể (xem nút riêng bên dưới).
 */
const SPOTS: Record<string, Spot[] | undefined> = {
  SHOULDER_R: [{ cx: 68, cy: 75, rx: 15, ry: 13 }],
  SHOULDER_L: [{ cx: 132, cy: 75, rx: 15, ry: 13 }],
  // Lưng trên/lưng dưới nhìn từ trước không thấy: đặt đúng chỗ trên thân rồi
  // dựa vào nhãn chữ, thay vì vẽ thêm một hình nhìn từ sau.
  UPPER_BACK: [{ cx: 100, cy: 113, rx: 27, ry: 18, labelled: true }],
  LOWER_BACK: [{ cx: 100, cy: 152, rx: 25, ry: 16, labelled: true }],
  HIP: [{ cx: 100, cy: 191, rx: 28, ry: 14, labelled: true }],
  // BODY_AREAS không chia trái/phải cho khuỷu và cổ tay, nên bắt chạm cả hai
  // tay về cùng một giá trị — bấm tay nào cũng ra đúng vùng đó.
  ELBOW: [
    { cx: 44, cy: 140, rx: 11, ry: 12 },
    { cx: 156, cy: 140, rx: 11, ry: 12 },
  ],
  WRIST: [
    { cx: 28, cy: 196, rx: 10, ry: 10 },
    { cx: 172, cy: 196, rx: 10, ry: 10 },
  ],
  KNEE_R: [{ cx: 78, cy: 252, rx: 13, ry: 14 }],
  KNEE_L: [{ cx: 122, cy: 252, rx: 13, ry: 14 }],
}

/** Đi theo thứ tự BODY_AREAS để thứ tự Tab trùng thứ tự danh sách gốc. */
const HOTSPOTS = BODY_AREAS.flatMap((area) =>
  (SPOTS[area.value] ?? []).map((spot, i) => ({ id: `${area.value}-${i}`, area, spot })),
)

/** Nút HTML nằm đè lên SVG nên toạ độ phải quy ra %, cùng một nguồn số với hình. */
function hitStyle({ cx, cy, rx, ry }: Spot) {
  const w = Math.max(rx * 2, MIN_HIT)
  const h = Math.max(ry * 2, MIN_HIT)
  return {
    left: `${((cx - w / 2) / VIEW_W) * 100}%`,
    top: `${((cy - h / 2) / VIEW_H) * 100}%`,
    width: `${(w / VIEW_W) * 100}%`,
    height: `${(h / VIEW_H) * 100}%`,
  }
}

/**
 * Sơ đồ cơ thể nhìn từ trước cho bộ chọn vùng đau (màn kết buổi).
 *
 * Hình vẽ để aria-hidden, phần bấm được là các <button> thật đè lên trên: được
 * bàn phím, được trình đọc màn hình, focus thấy được — không phải tự dựng lại
 * bằng div và onKeyDown.
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

  return (
    <div>
      <div className="relative mx-auto w-[240px] max-w-full">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block w-full" aria-hidden="true">
          {/* Cả hình vẽ dùng currentColor pha mờ để tự hợp theme, không chốt màu riêng. */}
          <g fill="currentColor" stroke="currentColor" opacity={0.2}>
            <ellipse cx={100} cy={31} rx={16} ry={19} />
            <rect x={92} y={44} width={16} height={20} rx={6} />
            <path d="M100 58C122 58 136 66 138 80C139 104 130 128 127 150C126 168 130 184 130 198L70 198C70 184 74 168 73 150C70 128 61 104 62 80C64 66 78 58 100 58Z" />
            {/* Tay chân là nét dày bo đầu — đủ ra hình người mà không phải vẽ đường bao. */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M68 78L44 140L26 206" strokeWidth={16} />
              <path d="M132 78L156 140L174 206" strokeWidth={16} />
              {/* Đùi vẽ dày gần bằng mép hông — để hở là nhìn ra cái váy chứ không ra chân. */}
              <path d="M84 186L78 252L74 306" strokeWidth={24} />
              <path d="M116 186L122 252L126 306" strokeWidth={24} />
            </g>
            <ellipse cx={71} cy={312} rx={13} ry={8} />
            <ellipse cx={129} cy={312} rx={13} ry={8} />
          </g>

          {/* Vùng chưa chọn vẫn hiện mờ, để người dùng thấy chỗ nào chạm được. */}
          {HOTSPOTS.map(({ id, area, spot }) => {
            const on = value === area.value
            return (
              <ellipse
                key={id}
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
                fill={on ? "var(--color-danger-tint)" : "currentColor"}
                fillOpacity={on ? 1 : 0.12}
                stroke={on ? "var(--color-danger)" : "none"}
                strokeWidth={2}
              />
            )
          })}

          {HOTSPOTS.filter(({ spot }) => spot.labelled).map(({ id, area, spot }) => (
            <text
              key={id}
              x={spot.cx}
              y={spot.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill={value === area.value ? "var(--color-danger)" : "currentColor"}
              fillOpacity={value === area.value ? 1 : 0.7}
            >
              {area.label}
            </text>
          ))}
        </svg>

        {HOTSPOTS.map(({ id, area, spot }) => (
          <button
            key={id}
            type="button"
            aria-label={area.label}
            aria-pressed={value === area.value}
            onClick={() => onChange(area.value)}
            style={hitStyle(spot)}
            className="absolute rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          />
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
        {BODY_AREAS.filter((area) => !SPOTS[area.value]).map((area) => {
          const on = value === area.value
          return (
            <button
              key={area.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(area.value)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px]",
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
